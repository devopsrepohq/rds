import * as cdk from '@aws-cdk/core';
import * as kms from '@aws-cdk/aws-kms';

import { IKey } from '@aws-cdk/aws-kms';

export class KmsStack extends cdk.Stack {
  public readonly kmsRds: IKey;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create encryption key for RDS database
    const kmsRds = new kms.Key(this, 'KmsRds', {
      alias: 'alias/rds-key',
      description: 'encryption key for RDS',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Assign the kmsRds to class property
    this.kmsRds = kmsRds
  }
}
