import { RemovalPolicy } from 'aws-cdk-lib';

export type EnvName = 'dev' | 'staging' | 'prod';

export interface EnvConfig {
  envName: EnvName;
  /** Optional explicit account; falls back to CDK_DEFAULT_ACCOUNT. */
  account?: string;
  region: string;
  removalPolicy: RemovalPolicy;
  pointInTimeRecovery: boolean;
  s3Versioned: boolean;
  enforceAdminMfa: boolean;
  /** CORS allowlist for the admin portal origin(s). */
  adminPortalOrigins: string[];
  logRetentionDays: number;
  /**
   * SNS platform application ARNs for native push (created during AWS setup with APNs/FCM
   * credentials, then supplied via `--context pushIosArn=... pushAndroidArn=...` or env).
   * When absent the in-app notification center still works; native push is skipped.
   */
  pushPlatformAppArnIos?: string;
  pushPlatformAppArnAndroid?: string;
}

const base = {
  region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

export const ENVIRONMENTS: Record<EnvName, EnvConfig> = {
  dev: {
    ...base,
    envName: 'dev',
    removalPolicy: RemovalPolicy.DESTROY,
    pointInTimeRecovery: false,
    s3Versioned: false,
    enforceAdminMfa: false,
    adminPortalOrigins: ['http://localhost:5173'],
    logRetentionDays: 14,
  },
  staging: {
    ...base,
    envName: 'staging',
    removalPolicy: RemovalPolicy.RETAIN,
    pointInTimeRecovery: true,
    s3Versioned: true,
    enforceAdminMfa: false,
    adminPortalOrigins: ['https://admin-staging.example.com'],
    logRetentionDays: 30,
  },
  prod: {
    ...base,
    envName: 'prod',
    removalPolicy: RemovalPolicy.RETAIN,
    pointInTimeRecovery: true,
    s3Versioned: true,
    enforceAdminMfa: true,
    adminPortalOrigins: ['https://admin.example.com'],
    logRetentionDays: 90,
  },
};

export function resolveEnv(name: string | undefined): EnvConfig {
  const key = (name ?? 'dev') as EnvName;
  const cfg = ENVIRONMENTS[key];
  if (!cfg) {
    throw new Error(`Unknown env "${name}". Use one of: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return cfg;
}
