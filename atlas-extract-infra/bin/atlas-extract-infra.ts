#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AtlasExtractInfraStack } from '../lib/atlas-extract-infra-stack';
import * as dotenv from 'dotenv';
dotenv.config();



const env = process.env.ENVIRONEMNT || 'dev';



const app = new cdk.App();
new AtlasExtractInfraStack(app, `AtlasExtractInfraStack-${env}`, {
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
});
