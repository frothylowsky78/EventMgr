import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration } from 'aws-cdk-lib';
import { EnvConfig } from '../config';

/**
 * Private S3 buckets for assets, profile photos, gallery uploads, imports, and exports.
 * All block public access; access is via pre-signed URLs issued by Lambda after authorization.
 */
export class Media extends Construct {
  readonly assets: s3.Bucket;
  readonly profilePhotos: s3.Bucket;
  readonly gallery: s3.Bucket;
  readonly imports: s3.Bucket;
  readonly exports: s3.Bucket;

  constructor(scope: Construct, id: string, config: EnvConfig) {
    super(scope, id);

    const make = (name: string, opts?: { lifecycleDays?: number }) =>
      new s3.Bucket(this, name, {
        bucketName: `event-app-${name.toLowerCase()}-${config.envName}`,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        versioned: config.s3Versioned,
        removalPolicy: config.removalPolicy,
        autoDeleteObjects: config.envName === 'dev',
        cors: [
          {
            allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
            allowedOrigins: ['*'], // pre-signed URLs are the security boundary, not CORS origin
            allowedHeaders: ['*'],
            maxAge: 3000,
          },
        ],
        lifecycleRules: opts?.lifecycleDays
          ? [{ expiration: Duration.days(opts.lifecycleDays) }]
          : undefined,
      });

    this.assets = make('assets');
    this.profilePhotos = make('profile-photos');
    this.gallery = make('gallery');
    this.imports = make('imports', { lifecycleDays: 30 });
    this.exports = make('exports', { lifecycleDays: 30 });
  }
}
