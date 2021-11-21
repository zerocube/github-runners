# Runner Cleaner

You may want to consider [registering an ephemeral runner](https://github.blog/changelog/2021-09-20-github-actions-ephemeral-self-hosted-runners-new-webhooks-for-auto-scaling/) instead.

---

This library uses an event rule to invoke a lambda function that will remove offline runners that have a specific label.  
At present this is hard-coded to 30 minutes.

The source code for this library was created prior to ephemeral runners being made available,
and in order to clean up runners whose host VMs had been terminated, this was implemented.

It requires the following parameters:

```
githubPATSSMParameterName: The name of an SSM parameter that contains a GitHub Personal Access Token with permission to remove runners via the API.

targetRunnerLabel: The labels which these self hosted runners will have, e.g. "self-hosted".
```
