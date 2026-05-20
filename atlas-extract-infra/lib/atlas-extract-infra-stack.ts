import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { SourcesBucket } from './s3/sourcesBucket';

export class AtlasExtractInfraStack extends cdk.Stack {
  private sourcesBucket: SourcesBucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.init();
  }

  private init() {
    this.sourcesBucket = new SourcesBucket(this, 'SourcesBucket');
  }

}
