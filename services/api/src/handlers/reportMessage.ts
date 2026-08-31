import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb } from '../lib/dynamo';
import { ApiException, fail, getAuth, ok } from '../lib/http';
import { TABLE_NAME, keys } from '../lib/keys';
import { requireParticipant, resolvePrincipal } from '../lib/messaging';
import { appendReport } from '../lib/reports';
import { contentReportSchema, parseBody } from '../lib/validation';

/**
 * POST /events/{eventId}/conversations/{conversationId}/messages/{messageId}/report — flag a
 * direct message for staff review (App Store guideline 1.2).
 *
 * Authorization is the participant pointer, same as reading the thread: you can only report a
 * message in a conversation you are part of. The conversation itself is flagged too, so the
 * staff feed can point at a thread rather than an orphaned message id.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const auth = getAuth(event);
    const principal = resolvePrincipal(auth, event.pathParameters?.eventId);
    const eventId = event.pathParameters?.eventId;
    const conversationId = event.pathParameters?.conversationId;
    const messageId = event.pathParameters?.messageId;
    if (!eventId || !conversationId || !messageId) {
      throw new ApiException('VALIDATION', 'eventId, conversationId and messageId are required');
    }

    const input = parseBody(contentReportSchema, event.body);
    await requireParticipant(principal.key, conversationId);

    // Messages are keyed MSG#{createdAt}#{id}, so the id alone isn't addressable.
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': keys.conversation(conversationId).PK,
          ':sk': keys.messagePrefix,
        },
      })
    );
    const message = (res.Items ?? []).find((m) => m.id === messageId);
    if (!message) throw new ApiException('NOT_FOUND', 'Message not found');

    const { reportCount, alreadyReported } = await appendReport({
      key: { PK: message.PK as string, SK: message.SK as string },
      item: message,
      eventId,
      targetType: 'message',
      targetId: messageId,
      conversationId,
      reportedBy: principal.participant.id,
      reason: input.reason,
      note: input.note,
      summary: (message.body as string) ?? '',
    });

    if (!alreadyReported) {
      // Flag the thread so staff can find it without knowing the message id.
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: keys.conversation(conversationId),
          UpdateExpression:
            'SET reported = :true ADD reportCount :one',
          ExpressionAttributeValues: { ':true': true, ':one': 1 },
        })
      );
    }

    return ok({ messageId, reported: true, reportCount, alreadyReported });
  } catch (e) {
    return fail(e);
  }
};
