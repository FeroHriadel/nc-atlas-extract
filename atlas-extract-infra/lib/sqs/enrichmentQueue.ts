import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT;



export class EnrichmentQueue extends Construct {
    public queue: sqs.Queue;
    public dlq: sqs.Queue;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.createQueues();
    }

    private createQueues() {
        this.dlq = new sqs.Queue(this, 'EnrichmentDlq', {
            queueName: `${env}-nc-atlas-extract-enrichment-dlq`,
            visibilityTimeout: cdk.Duration.minutes(2),
            retentionPeriod: cdk.Duration.days(14),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.queue = new sqs.Queue(this, 'EnrichmentQueue', {
            queueName: `${env}-nc-atlas-extract-enrichment-queue`,
            visibilityTimeout: cdk.Duration.minutes(10),
            retentionPeriod: cdk.Duration.days(4),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: {
                queue: this.dlq,
                maxReceiveCount: 2,
            },
        });
    }
}
