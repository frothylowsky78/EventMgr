#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { resolveEnv } from '../lib/config';
import { EventAppStack } from '../lib/event-app-stack';

const app = new cdk.App();

// Deploy a single environment chosen via context: `cdk deploy --context env=dev`
// (defaults to dev). Each environment is a fully isolated stack.
const envName = app.node.tryGetContext('env') as string | undefined;
const config = resolveEnv(envName);

new EventAppStack(app, `EventApp-${config.envName}`, {
  config,
  env: { account: config.account, region: config.region },
  description: `EventMgr backend (${config.envName})`,
  tags: { Project: 'EventMgr', Environment: config.envName },
});

app.synth();
