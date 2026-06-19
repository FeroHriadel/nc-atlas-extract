#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AtlasExtractInfraStack } from '../lib/atlas-extract-infra-stack';
import { CertificateStack } from '../lib/acm/certificateStack';
import { DeploymentStack } from '../lib/deployment/deploymentStack';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT || 'dev';
const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;



const app = new cdk.App();

const infraStack = new AtlasExtractInfraStack(app, `AtlasExtractInfraStack-${env}`, {
  env: { account, region },
});

if (env !== 'dev') {
  const certStack = new CertificateStack(app, 'CertificateStack', {
    env: { account, region: 'us-east-1' },
    crossRegionReferences: true,
  });

  new DeploymentStack(app, 'DeploymentStack', {
    env: { account, region },
    crossRegionReferences: true,
    sourcesTable:     infraStack.sourcesTable.sourcesTable,
    extractionsTable: infraStack.extractionsTable.table,
    enrichmentsTable: infraStack.enrichmentsTable.table,
    extractionQueue:  infraStack.extractionQueue.queue,
    enrichmentQueue:  infraStack.enrichmentQueue.queue,
    sourcesBucket:    infraStack.sourcesBucket.bucket,
    certificate:      certStack.certificate,
    apiKeysSecret:    infraStack.apiKeysSecret?.secret,
    imageGenFunction: infraStack.imageGenWorker.fn,
  });
}
