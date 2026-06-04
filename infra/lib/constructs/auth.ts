import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';

interface AuthProps {
  config: EnvConfig;
  table: dynamodb.Table;
}

/**
 * Cognito user pool for both attendees (email + access-code custom auth, passwordless)
 * and admins (username/password + MFA). Groups model roles; custom attributes carry the
 * attendeeId/eventId injected into tokens by the PreTokenGeneration trigger.
 */
export class Auth extends Construct {
  readonly userPool: cognito.UserPool;
  readonly appClient: cognito.UserPoolClient;
  readonly adminClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);
    const { config, table } = props;

    const defineChallenge = makeHandler(this, 'DefineAuthChallengeFn', {
      entry: 'auth/defineAuthChallenge.ts',
      config,
    });
    const createChallenge = makeHandler(this, 'CreateAuthChallengeFn', {
      entry: 'auth/createAuthChallenge.ts',
      config,
      table,
    });
    const verifyChallenge = makeHandler(this, 'VerifyAuthChallengeFn', {
      entry: 'auth/verifyAuthChallenge.ts',
      config,
    });
    const preToken = makeHandler(this, 'PreTokenGenerationFn', {
      entry: 'auth/preTokenGeneration.ts',
      config,
    });

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `eventmgr-${config.envName}`,
      selfSignUpEnabled: false, // attendees & admins are provisioned by staff
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      customAttributes: {
        attendeeId: new cognito.StringAttribute({ mutable: true }),
        eventId: new cognito.StringAttribute({ mutable: true }),
      },
      mfa: config.enforceAdminMfa ? cognito.Mfa.OPTIONAL : cognito.Mfa.OFF,
      mfaSecondFactor: { sms: false, otp: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      lambdaTriggers: {
        defineAuthChallenge: defineChallenge,
        createAuthChallenge: createChallenge,
        verifyAuthChallengeResponse: verifyChallenge,
        preTokenGeneration: preToken,
      },
      removalPolicy: config.removalPolicy,
    });

    // Cognito groups model roles consumed by the API authorizer / handlers.
    for (const groupName of ['attendee', 'event_staff', 'event_admin', 'super_admin']) {
      new cognito.CfnUserPoolGroup(this, `Group-${groupName}`, {
        userPoolId: this.userPool.userPoolId,
        groupName,
      });
    }

    // Mobile app client — custom auth (email + access code), no secret (public client).
    this.appClient = this.userPool.addClient('MobileClient', {
      userPoolClientName: `mobile-${config.envName}`,
      authFlows: { custom: true, userSrp: true },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // Admin portal client — password auth + MFA.
    this.adminClient = this.userPool.addClient('AdminClient', {
      userPoolClientName: `admin-${config.envName}`,
      authFlows: { userSrp: true, userPassword: true },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(7),
      preventUserExistenceErrors: true,
    });
  }
}
