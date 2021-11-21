# Github Runners CDK Construct

[![Run Tests](https://github.com/zerocube/github-runners/actions/workflows/branch-tests.yml/badge.svg)](https://github.com/zerocube/github-runners/actions/workflows/branch-tests.yml)

This library provides some CDK constructs to help get up and running with Github Runners.

## Usage

### Installation

```bash
npm install --save @zerocube/github-runners
```

### Using sub-libraries

For example, if you only want to import the RunnerAMI:

```js
import RunnerAMI from '@zerocube/github-runners/lib/runner-ami';

const runnerAMI = new RunnerAMI(this, "RunnerAMI", {
  asgName: "my-asg-name",
  tags: {
    application: "github-runners",
  },
})
```

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests