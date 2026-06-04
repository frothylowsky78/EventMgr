import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { AudiencePreview } from '@eventmgr/shared-types';
import { ApiException, fail, getAuth, ok, requireAdmin } from '../lib/http';
import { previewSchema, parseBody } from '../lib/validation';
import { resolveAudience } from '../lib/audience';

/**
 * POST /admin/events/{eventId}/notifications/preview — estimate recipient count + describe
 * the audience before sending (spec §18.16 Notification Preview).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    requireAdmin(getAuth(event));
    const eventId = event.pathParameters?.eventId;
    if (!eventId) throw new ApiException('VALIDATION', 'eventId is required');

    const { target } = parseBody(previewSchema, event.body);
    const { attendees, description } = await resolveAudience(eventId, target);

    const preview: AudiencePreview = {
      recipientCount: attendees.length,
      description,
    };
    return ok(preview);
  } catch (e) {
    return fail(e);
  }
};
