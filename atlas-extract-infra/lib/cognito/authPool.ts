import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT;



export class AuthPool extends Construct {
    public userPool: cognito.UserPool;
    public userPoolClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.createPool();
    }

    private createPool() {
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `${env}-nc-atlas-extract-user-pool`,
            selfSignUpEnabled: false,
            signInAliases: { email: true },
            autoVerify: { email: true },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: `${env}-nc-atlas-extract-app-client`,
            generateSecret: false,
            authFlows: {
                userSrp: true,
            },
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
            preventUserExistenceErrors: true,
        });
    }
}
