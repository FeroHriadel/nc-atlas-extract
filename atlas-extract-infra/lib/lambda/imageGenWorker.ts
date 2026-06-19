import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();



const env = process.env.ENVIRONEMNT;



interface ImageGenWorkerProps {
    imageJobsTable: dynamodb.Table;
    sourcesBucket: s3.Bucket;
    apiKeysSecret?: secretsmanager.ISecret;
}



export class ImageGenWorker extends Construct {
    public readonly fn: NodejsFunction;

    constructor(scope: Construct, id: string, props: ImageGenWorkerProps) {
        super(scope, id);

        this.fn = new NodejsFunction(this, 'ImageGenWorker', {
            functionName: `${env}-nc-atlas-extract-imagegen-worker`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, 'handlers/imageGenWorker.ts'),
            handler: 'handler',
            // invoked asynchronously (Event) by the .NET backend — it updates the job record when done
            timeout: cdk.Duration.minutes(2),
            memorySize: 512,
            environment: {
                IMAGE_JOBS_TABLE_NAME: props.imageJobsTable.tableName,
                SOURCES_BUCKET_NAME:   props.sourcesBucket.bucketName,
                ...(env === 'dev'
                    ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' }
                    : { API_KEYS_SECRET_ARN: props.apiKeysSecret!.secretArn }
                ),
            },
        });

        props.imageJobsTable.grantReadWriteData(this.fn);
        props.sourcesBucket.grantReadWrite(this.fn);
        if (env !== 'dev') props.apiKeysSecret!.grantRead(this.fn);
    }
}
