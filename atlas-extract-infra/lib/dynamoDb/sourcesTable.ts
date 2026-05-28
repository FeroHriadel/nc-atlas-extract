import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dotenv from 'dotenv';
dotenv.config();


const env = process.env.ENVIRONEMNT;

export class SourcesTable extends Construct {
    public table: dynamodb.Table;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.createTable();
    }

    private createTable() {
        this.table = new dynamodb.Table(this, 'SourcesTable', {
            tableName: `${env}-nc-atlas-extract-sources`,
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });
    }
}
