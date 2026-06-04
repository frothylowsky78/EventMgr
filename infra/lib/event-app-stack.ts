import { Construct } from 'constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { EnvConfig } from './config';
import { DataStore } from './constructs/data-store';
import { Media } from './constructs/media';
import { Auth } from './constructs/auth';
import { Api } from './constructs/api';
import { Web } from './constructs/web';
import { Observability } from './constructs/observability';
import { Backups } from './constructs/backup';

interface EventAppStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * One fully isolated environment (dev | staging | prod): data store, media buckets,
 * Cognito auth, HTTP API, and admin SPA hosting. Stack outputs feed the mobile/admin build config.
 */
export class EventAppStack extends Stack {
  constructor(scope: Construct, id: string, props: EventAppStackProps) {
    super(scope, id, props);
    const { config } = props;

    const data = new DataStore(this, 'DataStore', config);
    const media = new Media(this, 'Media', config);
    const auth = new Auth(this, 'Auth', { config, table: data.table });
    const api = new Api(this, 'Api', {
      config,
      table: data.table,
      userPool: auth.userPool,
      appClient: auth.appClient,
      adminClient: auth.adminClient,
      galleryBucket: media.gallery,
      profilePhotosBucket: media.profilePhotos,
    });
    const web = new Web(this, 'Web', config);

    new Observability(this, 'Observability', {
      config,
      httpApi: api.httpApi,
      asyncFunctions: [
        { name: 'PhotoProcess', fn: api.photoProcessFn },
        { name: 'NotificationSendJob', fn: api.sendJobFn },
      ],
    });

    new Backups(this, 'Backups', { config, table: data.table });

    // Outputs consumed by mobile (--dart-define) and admin (VITE_*) build configs.
    new CfnOutput(this, 'ApiUrl', { value: api.httpApi.apiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });
    new CfnOutput(this, 'MobileClientId', { value: auth.appClient.userPoolClientId });
    new CfnOutput(this, 'AdminClientId', { value: auth.adminClient.userPoolClientId });
    new CfnOutput(this, 'TableName', { value: data.table.tableName });
    new CfnOutput(this, 'GalleryBucket', { value: media.gallery.bucketName });
    new CfnOutput(this, 'AdminPortalUrl', {
      value: `https://${web.distribution.distributionDomainName}`,
    });
    new CfnOutput(this, 'Region', { value: this.region });
  }
}
