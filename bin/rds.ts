#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from '@aws-cdk/core';

import { BastionStack } from '../lib/bastion-stack';
import { KmsStack } from '../lib/kms-stack';
import { RdsStack } from '../lib/rds-stack';
import { SecurityStack } from '../lib/security-stack';
import { VpcStack } from '../lib/vpc-stack';

const app = new cdk.App();
const vpcStack = new VpcStack(app, 'VpcStack');
const securityStack = new SecurityStack(app, 'SecurityStack', { vpc: vpcStack.vpc });
const bastionStack = new BastionStack(app, 'BastionStack', { vpc: vpcStack.vpc, bastionSecurityGroup: securityStack.bastionSecurityGroup });
const kmsStack = new KmsStack(app, 'KmsStack');
new RdsStack(app, 'RdsStack', { vpc: vpcStack.vpc, bastionSecurityGroup: securityStack.bastionSecurityGroup, kmsRds: kmsStack.kmsRds });
