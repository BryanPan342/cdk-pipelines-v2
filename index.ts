import { App, Construct, SecretValue, Stack, StackProps, Stage, StageProps } from "@aws-cdk/core";
import * as sns from '@aws-cdk/aws-sns';
import * as iam from '@aws-cdk/aws-iam';
import * as pipelines from '@aws-cdk/pipelines';

interface MyStageProps extends StageProps {
  makeUnsafe?: boolean;
}

class MyStage extends Stage {
  constructor (scope: Construct, id: string, props?: MyStageProps) {
    super(scope, id, props);
    const stack = new Stack(this, props?.makeUnsafe ? 'MyUnsafeStack' : 'MyStack', {
      env: props?.env,
    });

    const topic = new sns.Topic(stack, 'Topic');
    topic.grantPublish(new iam.AccountPrincipal(stack.account));
  }
}


class PipelinesStack extends Stack {
  constructor (scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const pipeline = new pipelines.CodePipeline(this, 'C2APipeline', {
      pipelineName: 'C2APipeline',
      synth: new pipelines.ShellStep('Synth', {
        input: pipelines.CodePipelineSource.gitHub('bryanpan342/cdk-pipelines-v2', 'master', {
          authentication: SecretValue.secretsManager('github-token'),
        }),
        commands: [
          'yarn install',
          'yarn build build',
          'npx cdk synth',
        ],
      })
    });

    const stage1 = pipeline.addStage(new MyStage(this, 'Beta', { makeUnsafe: true }));
  }
}

const app = new App({
  context: {
    '@aws-cdk/core:newStyleStackSynthesis': 'true',
  },
});
new PipelinesStack(app, 'C2APipelinesStack', {
  env: { account: '045046196850', region: 'us-west-2' },
});
app.synth();
