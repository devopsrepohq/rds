import * as cdk from '@aws-cdk/core';
import * as kms from '@aws-cdk/aws-kms';

import { IKey } from '@aws-cdk/aws-kms';

export class KmsStack extends cdk.Stack {
  public readonly rdsKey: IKey;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get projectName and env from context variables
    const projectName = this.node.tryGetContext('project-name');
    const env = this.node.tryGetContext('env');
    
    // Create encryption key for RDS database
    const rdsKey = new kms.Key(this, 'RdsKey', {
      alias: `${projectName}/${env}/rds`,
      description: 'Encryption key for RDS',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Assign the kmsRds to class property
    this.rdsKey = rdsKey;
  }
}
