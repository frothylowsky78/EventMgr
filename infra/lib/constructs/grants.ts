import * as iam from 'aws-cdk-lib/aws-iam';
import type { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

/** SNS permissions for creating platform endpoints + publishing native push. */
export function grantPush(fn: NodejsFunction): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['sns:CreatePlatformEndpoint', 'sns:Publish'],
      resources: ['*'], // platform application + endpoint ARNs are dynamic
    })
  );
}

/** EventBridge Scheduler permissions + ability to pass the scheduler role. */
export function grantScheduling(fn: NodejsFunction, schedulerRoleArn: string): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule', 'scheduler:GetSchedule'],
      resources: ['*'],
    })
  );
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [schedulerRoleArn],
    })
  );
}

/**
 * Cognito user provisioning for the attendee-provision handler only. Scoped to the single user
 * pool ARN — do not widen this to other functions or to '*'.
 */
export function grantCognitoProvisioning(fn: NodejsFunction, userPoolArn: string): void {
  fn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminGetUser',
        'cognito-idp:ListUsers',
      ],
      resources: [userPoolArn],
    })
  );
}
