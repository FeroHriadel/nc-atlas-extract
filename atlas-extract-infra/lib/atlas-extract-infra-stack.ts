import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SourcesBucket } from './s3/sourcesBucket';
import { SourcesTable } from './dynamoDb/sourcesTable';
import { ExtractionsTable } from './dynamoDb/extractionsTable';
import { EnrichmentsTable } from './dynamoDb/enrichmentsTable';
import { ExtractionQueue } from './sqs/extractionQueue';
import { ExtractionWorker } from './lambda/extractionWorker';
import { EnrichmentQueue } from './sqs/enrichmentQueue';
import { EnrichmentWorker } from './lambda/enrichmentWorker';
import { AuthPool } from './cognito/authPool';



export class AtlasExtractInfraStack extends cdk.Stack {
  private sourcesBucket: SourcesBucket;
  private sourcesTable: SourcesTable;
  private extractionsTable: ExtractionsTable;
  private enrichmentsTable: EnrichmentsTable;
  private extractionQueue: ExtractionQueue;
  private enrichmentQueue: EnrichmentQueue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.init();
  }

  private init() {
    this.createSourcesBucket();
    this.createSourcesTable();
    this.createExtractionsTable();
    this.createEnrichmentsTable();
    this.createExtractionQueue();
    this.createExtractionWorker();
    this.createEnrichmentQueue();
    this.createEnrichmentWorker();
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

  private createEnrichmentsTable() {
    this.enrichmentsTable = new EnrichmentsTable(this, 'EnrichmentsTable');
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

  private createEnrichmentQueue() {
    this.enrichmentQueue = new EnrichmentQueue(this, 'EnrichmentQueue');
  }

  private createEnrichmentWorker() {
    new EnrichmentWorker(this, 'EnrichmentWorker', {
      queue: this.enrichmentQueue.queue,
      dlq: this.enrichmentQueue.dlq,
      enrichmentsTable: this.enrichmentsTable.table,
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
