import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { ContentReport, ReportReason } from '@eventmgr/shared-types';
import { ddb } from './dynamo';
import { TABLE_NAME, keys } from './keys';
import { newId } from './id';

/**
 * Reporting objectionable content (App Store guideline 1.2), shared by the photo and message
 * report handlers.
 *
 * Two writes per report: the reports array on the target itself (so a read of the photo or
 * message carries its own moderation state), and a mirror row in the event partition so staff
 * can list every report with one query instead of scanning conversations they aren't in.
 */
export async function appendReport(opts: {
  /** Dynamo key of the photo or message being reported. */
  key: Record<string, string>;
  /** The target as already read by the caller — supplies the existing reports array. */
  item: Record<string, any>;
  eventId: string;
  targetType: 'photo' | 'message';
  targetId: string;
  reportedBy: string;
  reason: ReportReason;
  note?: string;
  /** Caption or message text, copied so the staff feed reads on its own. */
  summary: string;
  conversationId?: string;
}): Promise<{ reportCount: number; alreadyReported: boolean }> {
  const existing = (opts.item.reports as ContentReport[] | undefined) ?? [];

  // Idempotent per reporter: a second tap must not inflate the count or double the feed.
  if (existing.some((r) => r.reportedBy === opts.reportedBy)) {
    return { reportCount: existing.length, alreadyReported: true };
  }

  const createdAt = new Date().toISOString();
  const report: ContentReport = {
    reportedBy: opts.reportedBy,
    reason: opts.reason,
    note: opts.note ?? '',
    createdAt,
  };
  const reports = [...existing, report];

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: opts.key,
      UpdateExpression:
        'SET reports = :reports, reported = :true, reportCount = :count, updatedAt = :now',
      ExpressionAttributeValues: {
        ':reports': reports,
        ':true': true,
        ':count': reports.length,
        ':now': createdAt,
      },
    })
  );

  const id = newId('rpt');
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.report(opts.eventId, createdAt, id),
        entity: 'ModerationReport',
        id,
        eventId: opts.eventId,
        targetType: opts.targetType,
        targetId: opts.targetId,
        conversationId: opts.conversationId ?? null,
        reportedBy: opts.reportedBy,
        reason: opts.reason,
        note: opts.note ?? '',
        summary: opts.summary.length > 300 ? `${opts.summary.slice(0, 297)}…` : opts.summary,
        createdAt,
      },
    })
  );

  return { reportCount: reports.length, alreadyReported: false };
}
