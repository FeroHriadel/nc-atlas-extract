import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();



const env = process.env.ENVIRONEMNT;



interface ExtractionWorkerProps {
    queue: sqs.Queue;
    extractionsTable: dynamodb.Table;
    sourcesBucket: s3.Bucket;
    apiKeysSecret?: secretsmanager.ISecret;
}



export class ExtractionWorker extends Construct {
    public fn: NodejsFunction;

    constructor(scope: Construct, id: string, props: ExtractionWorkerProps) {
        super(scope, id);
        this.createLambda(props);
    }

    private createLambda(props: ExtractionWorkerProps) {
        this.fn = new NodejsFunction(this, 'ExtractionWorker', {
            functionName: `${env}-nc-atlas-extract-extraction-worker`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, 'handlers/extractionWorker.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            environment: {
                EXTRACTIONS_TABLE_NAME: props.extractionsTable.tableName,
                SOURCES_BUCKET_NAME: props.sourcesBucket.bucketName,
                ...(env === 'dev'
                    ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '' }
                    : { API_KEYS_SECRET_ARN: props.apiKeysSecret!.secretArn }
                ),
            },
        });

        // trigger from SQS — processes one message at a time to keep Claude calls predictable
        this.fn.addEventSource(new lambdaEventSources.SqsEventSource(props.queue, {
            batchSize: 1,
        }));

        // grant permissions
        props.extractionsTable.grantReadWriteData(this.fn);
        props.sourcesBucket.grantReadWrite(this.fn);
        props.queue.grantConsumeMessages(this.fn);
        if (env !== 'dev') props.apiKeysSecret!.grantRead(this.fn);
    }
}
