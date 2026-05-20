import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class SourcesBucket extends Construct {
    public bucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.createBucket();
    }

    private createBucket() {
        this.bucket = new s3.Bucket(this, 'SourcesBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            bucketName: 'nc-atlas-extract-sources',
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });
    }

}