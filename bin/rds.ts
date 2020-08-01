#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RdsStack } from '../lib/rds-stack';

const app = new cdk.App();
new RdsStack(app, 'RdsStack');
