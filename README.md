# RDS

Use this CDK stack to create a RDS instances and allow bastion host to access it.

![RDS architecture](https://github.com/devopsrepohq/rds/blob/master/_docs/rds.png?raw=true)

# What is it?

Amazon Relational Database Service (Amazon RDS) makes it easy to set up, operate, and scale a relational database in the cloud.

# Features

- [x] Deploy a RDS Aurora Mysql instances
- [x] Use secrets manager to generate database password
- [x] Setup to allow bastion host to access it

# Prerequisites

You will need the following before utilize this CDK stack:

- [AWS CLI](https://cdkworkshop.com/15-prerequisites/100-awscli.html)
- [AWS Account and User](https://cdkworkshop.com/15-prerequisites/200-account.html)
- [Node.js](https://cdkworkshop.com/15-prerequisites/300-nodejs.html)
- [IDE for your programming language](https://cdkworkshop.com/15-prerequisites/400-ide.html)
- [AWS CDK Tookit](https://cdkworkshop.com/15-prerequisites/500-toolkit.html)
- [AWS Toolkit VSCode Extension](https://github.com/devopsrepohq/aws-toolkit)

# Stack Explain

## cdk.json

Define project-name and env context variables in cdk.json

```
{
  "context": {
    "project-name": "container",
    "env": "dev",
    "profile": "devopsrepo"
  }
}
```

## lib/vpc-stack.ts

Setup standard VPC with public, private, and isolated subnets.

```
const vpc = new ec2.Vpc(this, 'Vpc', {
  maxAzs: 3,
  natGateways: 1,
  cidr: '10.0.0.0/16',
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'ingress',
      subnetType: ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 24,
      name: 'application',
      subnetType: ec2.SubnetType.PRIVATE,
    },
    {
      cidrMask: 28,
      name: 'rds',
      subnetType: ec2.SubnetType.ISOLATED,
    }
  ]
});
```

- maxAzs - Define 3 AZs to use in this region.
- natGateways - Create only 1 NAT Gateways/Instances.
- cidr - Use '10.0.0.0/16' CIDR range for the VPC.
- subnetConfiguration - Build the public, private, and isolated subnet for each AZ.

Create flowlog and log the vpc traffic into cloudwatch

```
vpc.addFlowLog('FlowLog');
```

## lib/security-stack.ts

Get vpc create from vpc stack

```
const { vpc } = props;
```

Create security group for bastion host

```
const bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
  vpc: vpc,
  allowAllOutbound: true,
  description: 'Security group for bastion host',
  securityGroupName: 'BastionSecurityGroup'
});
```

- vpc - Use vpc created from vpc stack.
- allowAllOutbound - Allow outbound rules for access internet
- description - Description for security group
- securityGroupName - Define the security group name

## lib/bastion-stack.ts

Get the vpc and bastionSecurityGroup from vpc and security stacks.

```
const { vpc, bastionSecurityGroup } = props;
```

Create bastion host instance in public subnet

```
const bastionHostLinux = new ec2.BastionHostLinux(this, 'BastionHostLinux', {  
  vpc: vpc,
  securityGroup: bastionSecurityGroup,
  subnetSelection: {
    subnetType: ec2.SubnetType.PUBLIC
  }
});
```

- vpc - Use vpc created from vpc stack.
- securityGroup - Use security group created from security stack.
- subnetSelection - Create the instance in public subnet.

Display commands for connect bastion host using ec2 instance connect

```
const createSshKeyCommand = 'ssh-keygen -t rsa -f my_rsa_key';
const pushSshKeyCommand = `aws ec2-instance-connect send-ssh-public-key --region ${cdk.Aws.REGION} --instance-id ${bastionHostLinux.instanceId} --availability-zone ${bastionHostLinux.instanceAvailabilityZone} --instance-os-user ec2-user --ssh-public-key file://my_rsa_key.pub ${profile ? `--profile ${profile}` : ''}`
const sshCommand = `ssh -o "IdentitiesOnly=yes" -i my_rsa_key ec2-user@${bastionHostLinux.instancePublicDnsName}`
        
new cdk.CfnOutput(this, 'CreateSshKeyCommand', { value: createSshKeyCommand });
new cdk.CfnOutput(this, 'PushSshKeyCommand', { value: pushSshKeyCommand })
new cdk.CfnOutput(this, 'SshCommand', { value: sshCommand})
```

## lib/rds-stack.ts

Get the vpc, bastionSecurityGroup, rdsKey from vpc, security and kms stacks

```
const { vpc, bastionSecurityGroup, rdsKey } = props;
```

Get projectName and env from context variables

```
const projectName = this.node.tryGetContext('project-name');
const env = this.node.tryGetContext('env');
```

Create templated secret

```
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
```

Create RDS instances

```
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
  storageEncryptionKey: rdsKey
});
```

Allow bastion host to connect the RDS instances

```
cluster.connections.allowDefaultPortFrom(bastionSecurityGroup, 'Allow access from bastion host');
```

Deploy all the stacks to your aws account.

```
cdk deploy '*'
or
cdk deploy '*' --profile your_profile_name
```

# Useful commands

## NPM commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests

## Toolkit commands

 * `cdk list (ls)`            Lists the stacks in the app
 * `cdk synthesize (synth)`   Synthesizes and prints the CloudFormation template for the specified stack(s)
 * `cdk bootstrap`            Deploys the CDK Toolkit stack, required to deploy stacks containing assets
 * `cdk deploy`               Deploys the specified stack(s)
 * `cdk deploy '*'`           Deploys all stacks at once
 * `cdk destroy`              Destroys the specified stack(s)
 * `cdk destroy '*'`          Destroys all stacks at once
 * `cdk diff`                 Compares the specified stack with the deployed stack or a local CloudFormation template
 * `cdk metadata`             Displays metadata about the specified stack
 * `cdk init`                 Creates a new CDK project in the current directory from a specified template
 * `cdk context`              Manages cached context values
 * `cdk docs (doc)`           Opens the CDK API reference in your browser
 * `cdk doctor`               Checks your CDK project for potential problems

 # Pricing

As this cdk stack will create Aurora database service, please refer the following link for pricing

- [Amazon Aurora Pricing](https://aws.amazon.com/rds/aurora/pricing/)