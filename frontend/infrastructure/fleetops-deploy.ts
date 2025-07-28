import { App, Stack } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

function createFleetOpsInfrastructure(app: App) {
  const stack = new Stack(app, 'FleetOpsStack');

  // Create VPC with 2 availability zones
  const vpc = new ec2.Vpc(stack, 'FleetOpsVPC', {
    maxAzs: 2,
  });

  // Create Application Load Balancer
  const alb = new elbv2.ApplicationLoadBalancer(stack, 'ALB', {
    vpc: vpc,
    internetFacing: true,
  });

  // Create target group for Node.js application
  // (EC2 instances would be registered here)
  const targetGroup = new elbv2.ApplicationTargetGroup(stack, 'AppTargetGroup', {
    vpc: vpc,
    port: 3000,
    healthCheck: {
      path: '/api/stats',
    },
  });

  // Connect load balancer to target group
  alb.addListener('AppListener', {
    port: 80,
    defaultTargetGroups: [targetGroup],
  });

  // Basic security group for application
  const appSG = new ec2.SecurityGroup(stack, 'AppSG', {
    vpc: vpc,
    description: 'Allow traffic to Node.js application',
  });
  appSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'App traffic');
  appSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH access');

  return stack;
}

// Create the infrastructure
const app = new App();
createFleetOpsInfrastructure(app);