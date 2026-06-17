import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';



export class CertificateStack extends cdk.Stack {
    public readonly certificate: acm.Certificate;

    constructor(scope: Construct, id: string, props: cdk.StackProps) {
        super(scope, id, props);
        this.certificate = this.createCertificate();
    }

    private createCertificate(): acm.Certificate {
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: 'nclabs.eu',
        });

        return new acm.Certificate(this, 'WildcardCertificate', {
            domainName: '*.nclabs.eu',
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });
    }
}
