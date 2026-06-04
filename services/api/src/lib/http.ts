import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { ApiErrorCode, AuthContext, Role } from '@eventmgr/shared-types';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
};

const CORS_HEADERS = {
  'content-type': 'application/json',
  // Tightened to the admin origin(s) by API Gateway CORS config; permissive here as a fallback.
  'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
};

export class ApiException extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, statusCode = 200): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ data }),
});

export const fail = (e: unknown): APIGatewayProxyResultV2 => {
  if (e instanceof ApiException) {
    return {
      statusCode: STATUS_BY_CODE[e.code],
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: { code: e.code, message: e.message, details: e.details } }),
    };
  }
  // Avoid leaking internals; full error is logged for CloudWatch.
  console.error('Unhandled error', e);
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Internal server error' } }),
  };
};

/**
 * Extract the authenticated principal from the API Gateway Cognito JWT authorizer claims.
 * The roles come from `cognito:groups`; attendeeId / eventId from custom claims injected by the
 * PreTokenGeneration trigger.
 */
export function getAuth(event: APIGatewayProxyEventV2WithJWTAuthorizer): AuthContext {
  const claims = event.requestContext.authorizer?.jwt?.claims as
    | Record<string, unknown>
    | undefined;
  if (!claims) throw new ApiException('UNAUTHENTICATED', 'Missing authorizer claims');

  const rawGroups = claims['cognito:groups'];
  const roles = (
    Array.isArray(rawGroups)
      ? rawGroups
      : typeof rawGroups === 'string'
        ? rawGroups.replace(/[[\]]/g, '').split(/[\s,]+/).filter(Boolean)
        : []
  ) as Role[];

  return {
    userId: String(claims.sub ?? ''),
    email: claims.email ? String(claims.email) : undefined,
    attendeeId: claims['custom:attendeeId'] ? String(claims['custom:attendeeId']) : undefined,
    eventId: claims['custom:eventId'] ? String(claims['custom:eventId']) : undefined,
    roles,
  };
}

/** Raw request body as text, decoding base64 if API Gateway marked it binary. */
export function getRawBody(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

/** A text response (e.g. CSV / ICS export) with the right content-type + download filename. */
export function text(
  body: string,
  contentType: string,
  filename?: string
): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: {
      'content-type': contentType,
      ...(filename ? { 'content-disposition': `attachment; filename="${filename}"` } : {}),
    },
    body,
  };
}

export const isAdmin = (auth: AuthContext): boolean =>
  auth.roles.includes('event_admin') || auth.roles.includes('super_admin');

export function requireAdmin(auth: AuthContext): void {
  if (!isAdmin(auth)) {
    throw new ApiException('FORBIDDEN', 'Admin role required');
  }
}

export function requireAttendee(auth: AuthContext): string {
  if (!auth.attendeeId) {
    throw new ApiException('FORBIDDEN', 'No attendee context on this token');
  }
  return auth.attendeeId;
}
