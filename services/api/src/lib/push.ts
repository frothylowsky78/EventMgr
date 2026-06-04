import {
  SNSClient,
  CreatePlatformEndpointCommand,
  PublishCommand,
} from '@aws-sdk/client-sns';
import type { DeepLink, DevicePlatform, NotificationPriority } from '@eventmgr/shared-types';

const sns = new SNSClient({});

const PLATFORM_APP_ARN: Record<DevicePlatform, string | undefined> = {
  ios: process.env.PUSH_PLATFORM_APP_ARN_IOS,
  android: process.env.PUSH_PLATFORM_APP_ARN_ANDROID,
};

export const pushConfigured = (platform: DevicePlatform): boolean =>
  Boolean(PLATFORM_APP_ARN[platform]);

export interface PushPayload {
  title: string;
  body: string;
  priority: NotificationPriority;
  deepLink?: DeepLink | null;
  notificationId: string;
}

function buildMessage(platform: DevicePlatform, p: PushPayload): string {
  const data = {
    notificationId: p.notificationId,
    deepLinkType: p.deepLink?.type ?? '',
    deepLinkId: p.deepLink?.id ?? '',
    priority: p.priority,
  };

  if (platform === 'ios') {
    const aps = {
      aps: { alert: { title: p.title, body: p.body }, sound: 'default' },
      ...data,
    };
    return JSON.stringify({ default: p.body, APNS: JSON.stringify(aps), APNS_SANDBOX: JSON.stringify(aps) });
  }

  // Android / FCM (GCM legacy envelope used by SNS).
  const gcm = { notification: { title: p.title, body: p.body }, data };
  return JSON.stringify({ default: p.body, GCM: JSON.stringify(gcm) });
}

/**
 * Delivers one push to one device token. Returns true on success.
 * No-ops (returns false) when the platform application isn't configured yet — the in-app
 * notification center still works regardless of APNs/FCM credentials.
 */
export async function sendPush(
  platform: DevicePlatform,
  deviceToken: string,
  payload: PushPayload
): Promise<boolean> {
  const platformAppArn = PLATFORM_APP_ARN[platform];
  if (!platformAppArn) return false;

  try {
    const endpoint = await sns.send(
      new CreatePlatformEndpointCommand({
        PlatformApplicationArn: platformAppArn,
        Token: deviceToken,
      })
    );
    if (!endpoint.EndpointArn) return false;

    await sns.send(
      new PublishCommand({
        TargetArn: endpoint.EndpointArn,
        MessageStructure: 'json',
        Message: buildMessage(platform, payload),
      })
    );
    return true;
  } catch (e) {
    console.error('Push delivery failed', { platform, error: e });
    return false;
  }
}
