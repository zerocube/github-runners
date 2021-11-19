import { expect as expectCDK, countResources } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import GithubRunners from '../lib/index';

/*
 * Example test
 */
test('SNS Topic Created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new GithubRunners(stack, 'MyTestConstruct', {
    asgName: "github-runners-test",
  });
  // THEN
  expectCDK(stack).to(countResources("AWS::SNS::Topic", 0));
});
