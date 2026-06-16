import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();



const env = process.env.ENVIRONEMNT;



interface EnrichmentWorkerProps {
    queue: sqs.Queue;
    dlq: sqs.Queue;
    enrichmentsTable: dynamodb.Table;
    sourcesBucket: s3.Bucket;
}



export class EnrichmentWorker extends Construct {
    public fn: NodejsFunction;

    constructor(scope: Construct, id: string, props: EnrichmentWorkerProps) {
        super(scope, id);
        this.createWorkerLambda(props);
        this.createDlqProcessorLambda(props);
    }

    private createWorkerLambda(props: EnrichmentWorkerProps) {
        this.fn = new NodejsFunction(this, 'EnrichmentWorker', {
            functionName: `${env}-nc-atlas-extract-enrichment-worker`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, 'handlers/enrichmentWorker.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(10),
            memorySize: 1024,
            environment: {
                ENRICHMENTS_TABLE_NAME: props.enrichmentsTable.tableName,
                SOURCES_BUCKET_NAME:    props.sourcesBucket.bucketName,
                OPENAI_API_KEY:         process.env.OPENAI_API_KEY ?? '',
            },
        });

        this.fn.addEventSource(new lambdaEventSources.SqsEventSource(props.queue, {
            batchSize: 1,
            maxConcurrency: 3,
        }));

        props.enrichmentsTable.grantReadWriteData(this.fn);
        props.sourcesBucket.grantReadWrite(this.fn);
        props.queue.grantConsumeMessages(this.fn);
    }

    private createDlqProcessorLambda(props: EnrichmentWorkerProps) {
        const dlqProcessor = new NodejsFunction(this, 'EnrichmentDlqProcessor', {
            functionName: `${env}-nc-atlas-extract-enrichment-dlq-processor`,
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(__dirname, 'handlers/enrichmentDlqProcessor.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(1),
            memorySize: 256,
            environment: {
                ENRICHMENTS_TABLE_NAME: props.enrichmentsTable.tableName,
            },
        });

        dlqProcessor.addEventSource(new lambdaEventSources.SqsEventSource(props.dlq, {
            batchSize: 1,
        }));

        props.enrichmentsTable.grantReadWriteData(dlqProcessor);
        props.dlq.grantConsumeMessages(dlqProcessor);
    }
}
