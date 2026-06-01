import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT;
const queueName = process.env.QUEUE_NAME || 'nc-atlas-extract-queue';



export class ExtractionQueue extends Construct {
    public queue: sqs.Queue;
    public dlq: sqs.Queue;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.createQueues();
    }

    private createQueues() {
        this.dlq = new sqs.Queue(this, 'ExtractionDlq', {
            queueName: `${env}-nc-atlas-extract-extraction-dlq`,
            retentionPeriod: cdk.Duration.days(14),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.queue = new sqs.Queue(this, 'ExtractionQueue', {
            queueName: `${env}-${queueName}`,
            // must be >= Lambda timeout
            visibilityTimeout: cdk.Duration.minutes(5),
            retentionPeriod: cdk.Duration.days(4),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deadLetterQueue: {
                queue: this.dlq,
                maxReceiveCount: 3,
            },
        });
    }
}
