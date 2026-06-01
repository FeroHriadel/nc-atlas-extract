import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SourcesBucket } from './s3/sourcesBucket';
import { SourcesTable } from './dynamoDb/sourcesTable';
import { ExtractionsTable } from './dynamoDb/extractionsTable';
import { ExtractionQueue } from './sqs/extractionQueue';
import { ExtractionWorker } from './lambda/extractionWorker';



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
    this.sourcesBucket = new SourcesBucket(this, 'SourcesBucket');
    this.sourcesTable = new SourcesTable(this, 'SourcesTable');
    this.extractionsTable = new ExtractionsTable(this, 'ExtractionsTable');
    this.extractionQueue = new ExtractionQueue(this, 'ExtractionQueue');
    new ExtractionWorker(this, 'ExtractionWorker', {
      queue: this.extractionQueue.queue,
      extractionsTable: this.extractionsTable.table,
      sourcesBucket: this.sourcesBucket.bucket,
    });
  }

}
