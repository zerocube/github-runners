import * as cdk from '@aws-cdk/core';
import { RunnerAMI } from './runner-ami';

export interface GithubRunnersProps {
  asgName: string // The name of the ASG to create
  tags?: { [key: string]: string },
}

export default class GithubRunners extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: GithubRunnersProps) {
    super(scope, id);

    new RunnerAMI(this, "AMI", {
      asgName: props.asgName,
      tags: props.tags,
    })
  }
}
