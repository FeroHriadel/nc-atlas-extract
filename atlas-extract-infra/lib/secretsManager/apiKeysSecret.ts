import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT;



export class ApiKeysSecret extends Construct {
    public readonly secret: secretsmanager.Secret;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.secret = new secretsmanager.Secret(this, 'ApiKeysSecret', {
            secretName: `${env}-nc-atlas-extract-api-keys`,
            description: 'Anthropic and OpenAI API keys for Atlas Extract. Populate manually after first deploy.',
        });
    }
}
