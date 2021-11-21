import * as cdk from '@aws-cdk/core'
import { Code, Runtime, Function as LambdaFunction } from '@aws-cdk/aws-lambda'
import path = require('path')
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { Duration } from '@aws-cdk/core';
import { LambdaFunction as LambdaFunctionEventsTarget } from '@aws-cdk/aws-events-targets';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

export interface RunnerCleanerProps {
  verbose?: boolean
  dryRun?: boolean
  githubPATSSMParameterName: string
  targetRunnerLabel: string
}

export class RunnerCleaner extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: RunnerCleanerProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    const lambdaFunction: LambdaFunction = new LambdaFunction(this, "CleanerLambda", {
      runtime: Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: Code.fromAsset(path.join(__dirname, 'lambda', 'runner-cleaner')),
      environment: {
        VERBOSE: props.verbose ? "true" : "false",
        DRY_RUN: props.dryRun ? "true" : "false",
        SSM_PARAMETER_NAME_GITHUB_PAT: props.githubPATSSMParameterName,
        TARGET_RUNNER_LABEL: props.targetRunnerLabel,
      },
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ssm:GetParameter"],
          resources: [
            `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:parameter/${props.githubPATSSMParameterName}`,
          ]
        })
      ]
    });
    new Rule(this, "ScalerRule", {
      // Documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html
      schedule: Schedule.rate(Duration.minutes(30)),
      targets: [
        new LambdaFunctionEventsTarget(lambdaFunction),
      ]
    });
  }
}
