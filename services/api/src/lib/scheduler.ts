import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  FlexibleTimeWindowMode,
  ActionAfterCompletion,
} from '@aws-sdk/client-scheduler';

const scheduler = new SchedulerClient({});

const SEND_JOB_ARN = process.env.SEND_JOB_FUNCTION_ARN;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
/** Optional SQS DLQ for the schedule target — captures sends that fail after retries. */
const SCHEDULER_DLQ_ARN = process.env.SCHEDULER_DLQ_ARN;

export const schedulerConfigured = (): boolean =>
  Boolean(SEND_JOB_ARN && SCHEDULER_ROLE_ARN);

const scheduleName = (notificationId: string) => `notif-${notificationId}`;

/** EventBridge Scheduler wants at(yyyy-mm-ddThh:mm:ss) with no timezone offset. */
function toScheduleExpression(iso: string): string {
  const d = new Date(iso);
  return `at(${d.toISOString().replace(/\.\d{3}Z$/, '')})`;
}

/** Creates a one-time schedule that invokes the send-job Lambda at sendAt. */
export async function scheduleSend(
  eventId: string,
  notificationId: string,
  sendAtIso: string
): Promise<void> {
  if (!schedulerConfigured()) {
    throw new Error('Scheduler not configured (SEND_JOB_FUNCTION_ARN / SCHEDULER_ROLE_ARN)');
  }
  await scheduler.send(
    new CreateScheduleCommand({
      Name: scheduleName(notificationId),
      ScheduleExpression: toScheduleExpression(sendAtIso),
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
      ActionAfterCompletion: ActionAfterCompletion.DELETE,
      Target: {
        Arn: SEND_JOB_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({ eventId, notificationId }),
        // Retry the (synchronous) Lambda invoke, then route a persistent failure to the DLQ so a
        // scheduled notification is never silently dropped.
        RetryPolicy: { MaximumRetryAttempts: 3, MaximumEventAgeInSeconds: 3600 },
        ...(SCHEDULER_DLQ_ARN ? { DeadLetterConfig: { Arn: SCHEDULER_DLQ_ARN } } : {}),
      },
    })
  );
}

export async function cancelScheduledSend(notificationId: string): Promise<void> {
  if (!schedulerConfigured()) return;
  try {
    await scheduler.send(new DeleteScheduleCommand({ Name: scheduleName(notificationId) }));
  } catch (e) {
    // A missing schedule (already fired/deleted) is fine.
    console.warn('Delete schedule skipped', e);
  }
}
