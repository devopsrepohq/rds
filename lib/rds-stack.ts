import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

import { ISecurityGroup, IVpc } from '@aws-cdk/aws-ec2';

import { IKey } from '@aws-cdk/aws-kms';

interface RdsStackProps extends cdk.StackProps {
  vpc: IVpc;
  bastionSecurityGroup: ISecurityGroup;
  kmsRds: IKey;
}

export class RdsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    // Get the vpc, bastionSecurityGroup, kmsRds from vpc, security and kms stacks
    const { vpc, bastionSecurityGroup, kmsRds } = props;

    // Get projectName and env from context variables
    const projectName = this.node.tryGetContext('project-name');
    const env = this.node.tryGetContext('env');

    // Create templated secret
    const templatedSecret = new secretsmanager.Secret(this, 'TemplatedSecret', {
      description: 'Templated secret used for RDS password',
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
        passwordLength: 12,
        secretStringTemplate: JSON.stringify({ username: 'user' })
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY      
    });

    // Create RDS instances
    const cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_5_7_12
      }),
      instanceProps: {
        vpc: vpc,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
        vpcSubnets: {
          subnetType: ec2.SubnetType.ISOLATED
        }
      },
      masterUser: {
        username: 'admin',
        password: templatedSecret.secretValueFromJson('password')
      },
      defaultDatabaseName: `${projectName}${env}`,
      instances: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      storageEncryptionKey: kmsRds
    });

    // Allow bastion host to connect the RDS instances
    cluster.connections.allowDefaultPortFrom(bastionSecurityGroup, 'Allow access from bastion host');
  }
}
