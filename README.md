# Github Runners CDK Construct

[![Run Tests](https://github.com/zerocube/github-runners/actions/workflows/branch-tests.yml/badge.svg)](https://github.com/zerocube/github-runners/actions/workflows/branch-tests.yml)

This library provides some CDK constructs to help get up and running with Github Runners.

## Usage

### Installation

```bash
npm install --save @zerocube/github-runners
```

### Using specific component libraries

For example, if you only want to import the RunnerAMI:

```js
import { RunnerAMI } from '@zerocube/github-runners/lib/runner-ami';

const runnerAMI = new RunnerAMI(this, "RunnerAMI", {
  asgName: "my-asg-name",
  tags: {
    application: "github-runners",
  },
})
```

Documentation for each component can be found in the respective directory, e.g. `lib/runner-ami`.

## Other useful components

You may also want to use [AMI Sweeper](https://github.com/zerocube/ami-sweeper) to clean up old AMIs from RunnerAMI's EC2 Image Builder component.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests