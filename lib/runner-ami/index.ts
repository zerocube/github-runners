import * as cdk from '@aws-cdk/core';
import { SecurityGroup, UserData } from '@aws-cdk/aws-ec2';
import { CfnInstanceProfile, ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import {
  CfnComponent,
  CfnDistributionConfiguration,
  CfnImage,
  CfnImageRecipe,
  CfnInfrastructureConfiguration
} from '@aws-cdk/aws-imagebuilder';
import { Asset } from '@aws-cdk/aws-s3-assets';
import path = require('path');

export interface RunnerAMIProps {
  asgName: string
  securityGroups?: SecurityGroup[]
  additionalComponentARNs?: string[]
  tags?: { [key: string]: string }
}

export class RunnerAMI extends cdk.Construct {

  public static versionNumber: string = "0.1.12";

  public static runnerAppDirectory: string = "/usr/local/actions-runner"
  public static ansibleDirectory: string = "/usr/local/ansible"
  public static ansibleVarsFile: string = `${RunnerAMI.ansibleDirectory}/vars/vars.yml`
  public static ansibleVarsParameter: string = `--extra-vars "@${RunnerAMI.ansibleVarsFile}"`
  public static runnerUser: string = "github-runner"

  public static ansiblePlaybookCommand: string =
    `sudo --set-home --login --user "${RunnerAMI.runnerUser}" ansible-playbook`;
  public static installHeartbeatCronCommand: string =
    `${RunnerAMI.ansiblePlaybookCommand} ${RunnerAMI.ansibleVarsParameter} --become ` +
    `--extra-vars "vars_file=${RunnerAMI.ansibleVarsFile}" ` +
    `--extra-vars "playbook_path=${RunnerAMI.ansibleDirectory}/play/heartbeat.yml" ` +
    `--extra-vars "runner_user=${RunnerAMI.runnerUser}" ` +
    `"${RunnerAMI.ansibleDirectory}/play/install-heartbeat.yml"`
  public static runnerServiceStartCommand: string = `${RunnerAMI.runnerAppDirectory}/svc.sh start`;

  public readonly buildRole: Role
  public readonly image: CfnImage

  constructor(scope: cdk.Construct, id: string, props: RunnerAMIProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    this.buildRole = new Role(this, "ImageBuilderInstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
        ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceProfileForImageBuilder"),
      ],
      roleName: `${stack.stackName}-ib-instance-role`,
    });

    const instanceProfileName: string = stack.stackName;

    const imageBuilderInstanceProfile = new CfnInstanceProfile(this, "ImageBuilderInstanceProfile", {
      instanceProfileName: instanceProfileName,
      roles: [this.buildRole.roleName],
    });
    if (!imageBuilderInstanceProfile.instanceProfileName) {
      cdk.Annotations.of(imageBuilderInstanceProfile).addError(
        "imageBuilderInstanceProfile.instanceProfileName not set, but is required."
      );
      console.log(
        "imageBuilderInstanceProfile.instanceProfileName not set, but is required."
      )
      process.exit(1);
    }

    const imageInfraConfig = new CfnInfrastructureConfiguration(this, "ImageInfraConf", {
      name: instanceProfileName,
      instanceProfileName: imageBuilderInstanceProfile.instanceProfileName,
      instanceTypes: ["t3.large"],
      securityGroupIds: props.securityGroups?.map((group) => group.securityGroupId),
    });
    imageInfraConfig.node.addDependency(imageBuilderInstanceProfile);

    // Parent ansible directory where everything will be copied
    const ansibleDirectoryAsset = new Asset(this, "AnsibleDirectory", {
      path: path.join(__dirname, 'ansible'),
    });
    const ansiblePlaybooksDownloadCommand = UserData.forLinux();
    const ansibleDirectoryZipFile = ansiblePlaybooksDownloadCommand.addS3DownloadCommand({
      bucket: ansibleDirectoryAsset.bucket,
      bucketKey: ansibleDirectoryAsset.s3ObjectKey,
    });

    // Allow the instance role to read bucket contents where the directory asset lives
    ansibleDirectoryAsset.bucket.grantRead(this.buildRole);

    const appendVarsCommand: string = `tee -a "${RunnerAMI.ansibleVarsFile}"`

    const ansibleGalaxyCollections = [
      "community.general",
      "ansible.posix",
      "community.aws",
    ].join(" ");

    const aptPackages: string = [
      "zip", // Needed to extract in the aws-cli v2 component
      "unzip",
      "python3",
      "python3-pip",
    ].join(" ");
    const snapPackages: string = [
      "jq"
    ].join(" ");
    const pipPackages: string = [
      "boto3",
      "ansible",
    ].join(" ");

    const imagePackagesComponent = new CfnComponent(this, "PackagesComponent", {
      name: `${stack.stackName}-packages`,
      platform: `Linux`,
      version: RunnerAMI.versionNumber,
      data: JSON.stringify({
        name: "install-packages",
        description: `${stack.stackName} Package Installation`,
        schemaVersion: "1.0",
        constants: [],
        phases: [
          {
            name: "build",
            steps: [
              {
                name: "install_ansible_and_collections",
                action: "ExecuteBash",
                inputs: {
                  commands: [
                    `sudo apt update`,
                    `sudo apt install -y ${aptPackages}`,
                    `sudo snap install ${snapPackages}`,
                  ]
                }
              },
            ]
          }
        ]
      }),
    })

    const imageAppComponent = new CfnComponent(this, "AppComponent", {
      name: `${stack.stackName}-app`,
      platform: `Linux`,
      version: RunnerAMI.versionNumber,
      data: JSON.stringify({
        name: "install-github-runner",
        description: `${stack.stackName} App Installation`,
        schemaVersion: "1.0",
        constants: [],
        phases: [
          {
            name: "build",
            steps: [
              {
                name: "create_user",
                action: "ExecuteBash",
                inputs: {
                  commands: [
                    `useradd --create-home --groups "sudo,docker" "${RunnerAMI.runnerUser}"`,
                    `echo '${RunnerAMI.runnerUser} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/10-runner-user`,
                    `sudo --set-home --login -u "${RunnerAMI.runnerUser}" pip3 install ${pipPackages}`,
                    `sudo --set-home --login -u "${RunnerAMI.runnerUser}" ansible-galaxy collection install ${ansibleGalaxyCollections}`,
                  ],
                }
              },
              {
                name: "download_ansible_playbooks",
                action: "ExecuteBash",
                inputs: {
                  commands: [
                    ansiblePlaybooksDownloadCommand.render(),
                    `mkdir -p "${RunnerAMI.ansibleDirectory}"`,
                    `cd "${RunnerAMI.ansibleDirectory}" || exit`,
                    `unzip ${ansibleDirectoryZipFile}`,
                  ]
                }
              },
              {
                name: "run_ansible_playbooks",
                action: "ExecuteBash",
                inputs: {
                  commands: [
                    // Bootstrap some required directories
                    `mkdir -p "${RunnerAMI.runnerAppDirectory}"`,
                    `sudo chown -R "${RunnerAMI.runnerUser}:${RunnerAMI.runnerUser}" "${RunnerAMI.runnerAppDirectory}"`,

                    // Write some extra vars
                    `echo 'asg_name: "${props.asgName}"' | ${appendVarsCommand}`,
                    `echo 'runner_app_directory: "${RunnerAMI.runnerAppDirectory}"' | ${appendVarsCommand}`,

                    // Install the runner
                    `sudo --set-home --login -u "${RunnerAMI.runnerUser}" ansible-playbook ` +
                    `${RunnerAMI.ansibleVarsParameter} "${RunnerAMI.ansibleDirectory}/play/install-actions-runner.yml"`
                  ],
                }
              },
            ]
          }
        ]
      }),
    });

    const distributionConfig = new CfnDistributionConfiguration(this, "DistributionConfig", {
      name: stack.stackName,
      distributions: [{
        region: stack.region,
        amiDistributionConfiguration: {
          description: stack.stackName,
          amiTags: props.tags,
        },
      }],
      tags: props.tags,
    });

    var imageComponents: CfnImageRecipe.ComponentConfigurationProperty[] = [
      { componentArn: imagePackagesComponent.attrArn },
      { componentArn: `arn:aws:imagebuilder:${stack.region}:aws:component/aws-cli-version-2-linux/1.0.0` },
      { componentArn: `arn:aws:imagebuilder:${stack.region}:aws:component/amazon-cloudwatch-agent-linux/1.0.0` },
      { componentArn: `arn:aws:imagebuilder:${stack.region}:aws:component/docker-ce-ubuntu/1.0.0` },
      { componentArn: imageAppComponent.attrArn },
    ]
    props.additionalComponentARNs?.forEach((arn: string) => {
      imageComponents.push({ componentArn: arn } as CfnImageRecipe.ComponentConfigurationProperty)
    });

    const imageRecipe = new CfnImageRecipe(this, "Recipe", {
      name: stack.stackName,
      parentImage:
        `arn:${stack.partition}:imagebuilder:${stack.region}:aws:image/ubuntu-server-20-lts-x86/2021.2.24`,
      components: imageComponents,
      version: RunnerAMI.versionNumber,
    });

    this.image = new CfnImage(this, "Image", {
      infrastructureConfigurationArn: imageInfraConfig.attrArn,
      imageRecipeArn: imageRecipe.attrArn,
      distributionConfigurationArn: distributionConfig.attrArn,
      tags: props.tags,
    });

  }
}