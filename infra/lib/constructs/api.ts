import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvConfig } from '../config';
import { makeHandler } from './function-factory';

interface ApiProps {
  config: EnvConfig;
  table: dynamodb.Table;
  userPool: cognito.UserPool;
  appClient: cognito.UserPoolClient;
  adminClient: cognito.UserPoolClient;
}

/**
 * HTTP API with a Cognito JWT authorizer. Each route maps to its own Lambda with
 * least-privilege table access. See docs/api-contract.md.
 */
export class Api extends Construct {
  readonly httpApi: apigw.HttpApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);
    const { config, table, userPool, appClient, adminClient } = props;

    this.httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: `eventmgr-${config.envName}`,
      corsPreflight: {
        allowOrigins: config.adminPortalOrigins,
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['authorization', 'content-type'],
        maxAge: Duration.hours(1),
      },
    });

    const authorizer = new HttpJwtAuthorizer(
      'CognitoAuthorizer',
      `https://cognito-idp.${config.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        identitySource: ['$request.header.Authorization'],
        jwtAudience: [appClient.userPoolClientId, adminClient.userPoolClientId],
      }
    );

    const route = (
      id: string,
      method: apigw.HttpMethod,
      routePath: string,
      entry: string,
      access: 'read' | 'write',
      opts: { secured?: boolean } = {}
    ) => {
      const fn = makeHandler(this, id, { entry, config, table, access });
      this.httpApi.addRoutes({
        path: routePath,
        methods: [method],
        integration: new HttpLambdaIntegration(`${id}Int`, fn),
        authorizer: opts.secured === false ? undefined : authorizer,
      });
    };

    // Public
    route('Health', apigw.HttpMethod.GET, '/health', 'health.ts', 'read', { secured: false });

    // Attendee — self
    route('GetMe', apigw.HttpMethod.GET, '/me', 'getMe.ts', 'read');
    route('GetMyItinerary', apigw.HttpMethod.GET, '/me/itinerary', 'getMyItinerary.ts', 'read');

    // Event content
    route('GetEvent', apigw.HttpMethod.GET, '/events/{eventId}', 'getEvent.ts', 'read');
    route('ListAgenda', apigw.HttpMethod.GET, '/events/{eventId}/agenda', 'listAgenda.ts', 'read');

    // Admin — agenda CRUD (role enforced inside the handler in addition to the authorizer)
    route('AdminListAgenda', apigw.HttpMethod.GET, '/admin/events/{eventId}/agenda', 'adminListAgenda.ts', 'read');
    route('AdminCreateAgenda', apigw.HttpMethod.POST, '/admin/events/{eventId}/agenda', 'adminCreateAgenda.ts', 'write');
    route('AdminUpdateAgenda', apigw.HttpMethod.PATCH, '/admin/events/{eventId}/agenda/{agendaId}', 'adminUpdateAgenda.ts', 'write');
  }
}
