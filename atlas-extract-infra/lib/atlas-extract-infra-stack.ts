import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SourcesBucket } from './s3/sourcesBucket';
import { SourcesTable } from './dynamoDb/sourcesTable';



export class AtlasExtractInfraStack extends cdk.Stack {
  private sourcesBucket: SourcesBucket;
  private sourcesTable: SourcesTable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.init();
  }

  private init() {
    this.sourcesBucket = new SourcesBucket(this, 'SourcesBucket');
    this.sourcesTable = new SourcesTable(this, 'SourcesTable');
  }

}
