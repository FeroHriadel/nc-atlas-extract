import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';



interface DeploymentStackProps extends cdk.StackProps {
    sourcesTable: dynamodb.ITable;
    extractionsTable: dynamodb.ITable;
    enrichmentsTable: dynamodb.ITable;
    extractionQueue: sqs.IQueue;
    enrichmentQueue: sqs.IQueue;
    sourcesBucket: s3.IBucket;
    certificate: acm.ICertificate;
    apiKeysSecret?: secretsmanager.ISecret;
    imageGenFunction: lambda.IFunction;
    imageJobsTable: dynamodb.ITable;
}



export class DeploymentStack extends cdk.Stack {
    public readonly instance: ec2.Instance;

    constructor(scope: Construct, id: string, props: DeploymentStackProps) {
        super(scope, id, props);
        const artifactBucket = this.createArtifactBucket();
        const vpc            = this.createVpc();
        const sg             = this.createSecurityGroup(vpc);
        const role           = this.createInstanceRole(props, artifactBucket);
        this.instance        = this.createInstance(vpc, sg, role);
        const hostedZone     = this.lookupHostedZone();
        const eip            = this.createEip(this.instance);
        const originDomain   = this.createOriginRecord(hostedZone, eip); // CF rejects raw IPs as origin — needs a domain name
        const fallbackBucket = this.createFallbackBucket();
        const distribution   = this.createDistribution(originDomain, props.certificate, fallbackBucket);
        this.createDnsRecord(hostedZone, distribution);
        this.createGithubDeploymentRole(artifactBucket);
    }

    private createArtifactBucket(): s3.Bucket {
        return new s3.Bucket(this, 'ArtifactBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [{ expiration: cdk.Duration.days(7) }],
        });
    }

    private createVpc(): ec2.Vpc {
        return new ec2.Vpc(this, 'Vpc', {
            maxAzs: 1,
            natGateways: 0,
            subnetConfiguration: [{
                name: 'Public',
                subnetType: ec2.SubnetType.PUBLIC,
                cidrMask: 24,
            }],
        });
    }

    private createSecurityGroup(vpc: ec2.Vpc): ec2.SecurityGroup {
        const sg = new ec2.SecurityGroup(this, 'AppSg', {
            vpc,
            description: 'Allow HTTP from CloudFront only',
            allowAllOutbound: true,
        });

        // Look up the CloudFront managed prefix list ID dynamically so we don't hardcode a region-specific value
        const prefixListLookup = new cr.AwsCustomResource(this, 'CloudFrontPrefixList', {
            onUpdate: {
                service: 'EC2',
                action: 'DescribeManagedPrefixLists',
                parameters: {
                    Filters: [{ Name: 'prefix-list-name', Values: ['com.amazonaws.global.cloudfront.origin-facing'] }],
                },
                physicalResourceId: cr.PhysicalResourceId.fromResponse('PrefixLists.0.PrefixListId'),
            },
            policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE }),
        });

        sg.addIngressRule(
            ec2.Peer.prefixList(prefixListLookup.getResponseField('PrefixLists.0.PrefixListId')),
            ec2.Port.tcp(80),
            'CloudFront origin-facing'
        );

        return sg;
    }

    private createInstanceRole(props: DeploymentStackProps, artifactBucket: s3.Bucket): iam.Role {
        const role = new iam.Role(this, 'Ec2Role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                // SSM agent access — required for GitHub Actions deployment via SSM RunCommand
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
            ],
        });

        props.sourcesTable.grantReadWriteData(role);
        props.extractionsTable.grantReadWriteData(role);
        props.enrichmentsTable.grantReadWriteData(role);
        props.extractionQueue.grantSendMessages(role);
        props.enrichmentQueue.grantSendMessages(role);
        props.sourcesBucket.grantReadWrite(role);
        artifactBucket.grantRead(role);
        props.apiKeysSecret?.grantRead(role);
        props.imageGenFunction.grantInvoke(role);
        props.imageJobsTable.grantReadWriteData(role);

        return role;
    }

    private createInstance(vpc: ec2.Vpc, sg: ec2.SecurityGroup, role: iam.Role): ec2.Instance {
        const userData = ec2.UserData.forLinux();
        userData.addCommands(
            'mkdir -p /opt/atlas-extract',
            // Write the systemd service file. The binary is deployed later by the CI pipeline.
            `cat > /etc/systemd/system/atlas-extract.service <<'SVCEOF'
[Unit]
Description=Atlas Extract Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/atlas-extract
ExecStart=/opt/atlas-extract/atlas-extract-server
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://+:80
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF`,
            'systemctl daemon-reload',
            // Enable so it starts automatically on reboot after the pipeline deploys the binary
            'systemctl enable atlas-extract'
        );

        const instance = new ec2.Instance(this, 'AppInstance', {
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            securityGroup: sg,
            role,
            userData,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            associatePublicIpAddress: true,
        });

        new cdk.CfnOutput(this, 'InstanceId', { value: instance.instanceId });

        return instance;
    }

    private createEip(instance: ec2.Instance): ec2.CfnEIP {
        const eip = new ec2.CfnEIP(this, 'AppEip', { domain: 'vpc' });
        new ec2.CfnEIPAssociation(this, 'AppEipAssociation', {
            instanceId: instance.instanceId,
            allocationId: eip.attrAllocationId,
        });
        new cdk.CfnOutput(this, 'ElasticIp', { value: eip.ref });
        return eip;
    }

    private lookupHostedZone(): route53.IHostedZone {
        return route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: 'nclabs.eu' });
    }

    private createOriginRecord(hostedZone: route53.IHostedZone, eip: ec2.CfnEIP): string {
        new route53.ARecord(this, 'OriginRecord', {
            zone: hostedZone,
            recordName: 'origin.atlas-extract',
            target: route53.RecordTarget.fromIpAddresses(eip.ref),
        });
        return 'origin.atlas-extract.nclabs.eu';
    }

    private createFallbackBucket(): s3.Bucket {
        const bucket = new s3.Bucket(this, 'FallbackBucket', {
            bucketName: 'atlas-extract.nclabs.eu',
            websiteIndexDocument: 'maintenance.html',
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: true,
                ignorePublicAcls: true,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        bucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [bucket.arnForObjects('*')],
            principals: [new iam.AnyPrincipal()],
        }));

        new s3deploy.BucketDeployment(this, 'FallbackDeploy', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../static'))],
            destinationBucket: bucket,
        });

        return bucket;
    }

    private createDistribution(originDomain: string, certificate: acm.ICertificate, fallbackBucket: s3.Bucket): cloudfront.Distribution {
        // CloudFront fetches maintenance.html from S3 via HTTP internally — viewers always get HTTPS
        const maintenanceOrigin = new origins.HttpOrigin(fallbackBucket.bucketWebsiteDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            connectionAttempts: 1,
            connectionTimeout: cdk.Duration.seconds(3),
        });

        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.HttpOrigin(originDomain, {
                    protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
                    httpPort: 80,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            },
            additionalBehaviors: {
                '/maintenance.html': {
                    origin: maintenanceOrigin,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                },
            },
            // When EC2 is down CloudFront gets 502/503/504 — serve the maintenance page instead
            errorResponses: [
                { httpStatus: 502, responseHttpStatus: 200, responsePagePath: '/maintenance.html', ttl: cdk.Duration.seconds(10) },
                { httpStatus: 503, responseHttpStatus: 200, responsePagePath: '/maintenance.html', ttl: cdk.Duration.seconds(10) },
                { httpStatus: 504, responseHttpStatus: 200, responsePagePath: '/maintenance.html', ttl: cdk.Duration.seconds(10) },
            ],
            domainNames: ['atlas-extract.nclabs.eu'],
            certificate,
        });
        new cdk.CfnOutput(this, 'DistributionDomain', { value: distribution.distributionDomainName });
        return distribution;
    }

    private createDnsRecord(hostedZone: route53.IHostedZone, distribution: cloudfront.Distribution): void {
        new route53.ARecord(this, 'AppDnsRecord', {
            zone: hostedZone,
            recordName: 'atlas-extract',
            target: route53.RecordTarget.fromAlias(
                new route53Targets.CloudFrontTarget(distribution)
            ),
        });
    }

    private createGithubDeploymentRole(artifactBucket: s3.Bucket): void {
        // One OIDC provider per account for GitHub — if this fails with "already exists",
        // replace with: iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GithubOidc',
        //   `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`)
        const oidcProvider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
            thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
        });

        const githubRole = new iam.Role(this, 'GithubActionsRole', {
            assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
                StringLike: {
                    'token.actions.githubusercontent.com:sub': 'repo:FeroHriadel/nc-atlas-extract:*',
                },
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
            }),
        });

        artifactBucket.grantReadWrite(githubRole);

        const instanceArn = `arn:aws:ec2:${this.region}:${this.account}:instance/${this.instance.instanceId}`;
        githubRole.addToPolicy(new iam.PolicyStatement({
            actions: ['ssm:SendCommand'],
            resources: [
                `arn:aws:ssm:${this.region}::document/AWS-RunShellScript`,
                instanceArn,
            ],
        }));
        // GetCommandInvocation does not support resource-level restrictions
        githubRole.addToPolicy(new iam.PolicyStatement({
            actions: ['ssm:GetCommandInvocation'],
            resources: ['*'],
        }));

        new cdk.CfnOutput(this, 'GithubActionsRoleArn',  { value: githubRole.roleArn });
        new cdk.CfnOutput(this, 'ArtifactBucketName',    { value: artifactBucket.bucketName });
    }
}
