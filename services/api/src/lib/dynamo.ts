import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Shared DynamoDB document client. Honors DYNAMODB_ENDPOINT for local development
 * (DynamoDB Local) so handlers and the seed script run without live AWS.
 */
const endpoint = process.env.DYNAMODB_ENDPOINT;

const base = new DynamoDBClient(
  endpoint
    ? {
        endpoint,
        region: process.env.AWS_REGION ?? 'us-west-2',
        credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
      }
    : {}
);

export const ddb = DynamoDBDocumentClient.from(base, {
  marshallOptions: { removeUndefinedValues: true },
});
