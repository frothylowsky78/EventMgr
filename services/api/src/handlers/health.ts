import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { ok } from '../lib/http';

export const handler = async (): Promise<APIGatewayProxyResultV2> =>
  ok({ status: 'ok', service: 'eventmgr-api', time: new Date().toISOString() });
