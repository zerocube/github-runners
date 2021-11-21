import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import GithubRunners from '../lib/index';
import { RunnerAMI } from '../lib/runner-ami';

/*
 * Example test
 */
test('No SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new GithubRunners(stack, 'MyTestConstruct', {
    asgName: "github-runners-test",
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic", 0));
});

test('Runner AMI Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestAMIStack");
  // WHEN
  new RunnerAMI(stack, "RunnerAMI", {
    asgName: "some-asg-name",
  })
  // THEN
  expectCDK(stack).to(countResources("AWS::ImageBuilder::InfrastructureConfiguration", 1));
  expectCDK(stack).to(countResources("AWS::ImageBuilder::DistributionConfiguration", 1));
  expectCDK(stack).to(countResources("AWS::ImageBuilder::ImageRecipe", 1));
  expectCDK(stack).to(countResources("AWS::ImageBuilder::Image", 1));
})
