import { deliverNotification } from '../lib/notificationSender';

interface SendJobEvent {
  eventId: string;
  notificationId: string;
}

/**
 * Invoked by EventBridge Scheduler at a notification's sendAt time (not on the public API).
 * Delivers the scheduled notification exactly as an immediate send would.
 */
export const handler = async (event: SendJobEvent): Promise<void> => {
  if (!event?.eventId || !event?.notificationId) {
    console.error('notificationSendJob: missing eventId/notificationId', event);
    return;
  }
  const result = await deliverNotification(event.eventId, event.notificationId);
  console.log('Scheduled notification delivered', {
    notificationId: event.notificationId,
    recipientCount: result.recipientCount,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });
};
