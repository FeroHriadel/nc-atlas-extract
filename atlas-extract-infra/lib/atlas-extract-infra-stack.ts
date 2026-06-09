import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SourcesBucket } from './s3/sourcesBucket';
import { SourcesTable } from './dynamoDb/sourcesTable';
import { ExtractionsTable } from './dynamoDb/extractionsTable';
import { ExtractionQueue } from './sqs/extractionQueue';
import { ExtractionWorker } from './lambda/extractionWorker';
import { AuthPool } from './cognito/authPool';



export class AtlasExtractInfraStack extends cdk.Stack {
  private sourcesBucket: SourcesBucket;
  private sourcesTable: SourcesTable;
  private extractionsTable: ExtractionsTable;
  private extractionQueue: ExtractionQueue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.init();
  }

  private init() {
    this.createSourcesBucket();
    this.createSourcesTable();
    this.createExtractionsTable();
    this.createExtractionQueue();
    this.createExtractionWorker();
    this.createAuthPool();
  }

  private createSourcesBucket() {
    this.sourcesBucket = new SourcesBucket(this, 'SourcesBucket');
  }

  private createSourcesTable() {
    this.sourcesTable = new SourcesTable(this, 'SourcesTable');
  }

  private createExtractionsTable() {
    this.extractionsTable = new ExtractionsTable(this, 'ExtractionsTable');
  }

  private createExtractionQueue() {
    this.extractionQueue = new ExtractionQueue(this, 'ExtractionQueue');
  }

  private createExtractionWorker() {
    new ExtractionWorker(this, 'ExtractionWorker', {
      queue: this.extractionQueue.queue,
      extractionsTable: this.extractionsTable.table,
      sourcesBucket: this.sourcesBucket.bucket,
    });
  }

  private createAuthPool() {
    const authPool = new AuthPool(this, 'AuthPool');
    new cdk.CfnOutput(this, 'UserPoolId',       { value: authPool.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: authPool.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'UserPoolRegion',   { value: this.region });
  }

}
