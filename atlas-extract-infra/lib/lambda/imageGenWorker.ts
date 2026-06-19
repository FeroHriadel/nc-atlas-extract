import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();



const env = process.env.ENVIRONEMNT;



interface ImageGenWorkerProps {
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
            // invoked synchronously by the .NET backend and waited on — keep well under typical OpenAI image-gen latency
            timeout: cdk.Duration.seconds(60),
            memorySize: 512,
            environment: {
                ...(env === 'dev'
                    ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '' }
                    : { API_KEYS_SECRET_ARN: props.apiKeysSecret!.secretArn }
                ),
            },
        });

        if (env !== 'dev') props.apiKeysSecret!.grantRead(this.fn);
    }
}
