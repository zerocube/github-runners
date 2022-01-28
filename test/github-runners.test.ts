import { expect as expectCDK, haveResource, not } from '@aws-cdk/assert';
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
  expectCDK(stack).to(not(haveResource("AWS::SNS::Topic")));
});

test('Runner AMI Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestAMIStack");
  // WHEN
  new RunnerAMI(stack, "RunnerAMI", {
    asgName: "some-asg-name",
  })

  // THEN
  expectCDK(stack).to(haveResource("AWS::ImageBuilder::InfrastructureConfiguration"));
  expectCDK(stack).to(haveResource("AWS::ImageBuilder::DistributionConfiguration"));
  expectCDK(stack).to(haveResource("AWS::ImageBuilder::ImageRecipe"));
  expectCDK(stack).to(haveResource("AWS::ImageBuilder::Image"));
})
