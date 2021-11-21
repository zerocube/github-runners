import { Octokit } from "@octokit/core";
import { SSM } from "aws-sdk"

const ssm: SSM = new SSM();
var octokit: Octokit
var githubPAT: string

var githubPATSSMParameter: string
if (!process.env.SSM_PARAMETER_NAME_GITHUB_PAT) {
  console.error("SSM_PARAMETER_NAME_GITHUB_PAT not set.");
  process.exit(10);
} else {
  githubPATSSMParameter = process.env.SSM_PARAMETER_NAME_GITHUB_PAT
}
var targetLabel: string
if (!process.env.TARGET_RUNNER_LABEL) {
  console.error("TARGET_RUNNER_LABEL not set.");
  process.exit(10);
} else {
  targetLabel = process.env.TARGET_RUNNER_LABEL
}

const githubOrgName: string = "zerocube"

async function clearOldRunners() {

  const verbose = process.env.VERBOSE?.trim().toLowerCase() == "true"
  const dryRun = process.env.DRY_RUN?.trim().toLowerCase() == "true"

  // Set the githubPAT if undefined
  if (!githubPAT) {
    const ssmParameter: SSM.Types.GetParameterResult = await ssm.getParameter({
      Name: githubPATSSMParameter,
    }).promise();
    if (ssmParameter.Parameter?.Value) {
      githubPAT = ssmParameter.Parameter.Value
    } else {
      console.error("No parameter value returned")
    }
  }

  // Initialise the octokit client
  octokit = new Octokit({ auth: githubPAT });

  // Make the call to list all the runners
  const response = await octokit.request("GET /orgs/{org}/actions/runners", {
    org: githubOrgName,
    per_page: 100,
  });

  for (let runner of response.data.runners) {

    // Only target offline runners
    if (runner.status == "offline") {
      let runnerIdString: string = `#${runner.id} (${runner.name})`;
      verbose && console.log(`Runner ${runnerIdString} is offline.`);
      // ... And only if they have the target label.
      let hasTargetLabel: boolean = runner.labels.filter((label) => label.name == targetLabel).length > 0
      if (hasTargetLabel) {
        verbose && console.log(`Runner ${runnerIdString} has the target label.`)
        if (dryRun) {
          console.log(`[Dry Run]: This would remove runner ${runnerIdString}`)
          continue
        } else {
          await octokit.request('DELETE /orgs/{org}/actions/runners/{runner_id}', {
            org: githubOrgName,
            runner_id: runner.id,
          })
        }
      }
    }
  }
}

exports.handler = clearOldRunners

if (process.env.RUN_LOCALLY?.trim().toLowerCase() == "true") {
  clearOldRunners();
}