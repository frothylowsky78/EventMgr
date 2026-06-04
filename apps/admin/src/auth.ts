import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from './config';

const pool = new CognitoUserPool({
  UserPoolId: config.userPoolId,
  ClientId: config.adminClientId,
});

export interface AdminSession {
  email: string;
  idToken: string;
  accessToken: string;
  groups: string[];
}

function sessionToAdmin(email: string, session: CognitoUserSession): AdminSession {
  const payload = session.getIdToken().decodePayload();
  const groups = (payload['cognito:groups'] as string[] | undefined) ?? [];
  return {
    email,
    idToken: session.getIdToken().getJwtToken(),
    accessToken: session.getAccessToken().getJwtToken(),
    groups,
  };
}

/** Admin login via Cognito SRP. Handles the NEW_PASSWORD_REQUIRED first-login challenge. */
export function signIn(
  email: string,
  password: string,
  newPassword?: string
): Promise<AdminSession> {
  const user = new CognitoUser({ Username: email, Pool: pool });
  const details = new AuthenticationDetails({ Username: email, Password: password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(sessionToAdmin(email, session)),
      onFailure: (err) => reject(err),
      newPasswordRequired: (attrs) => {
        if (!newPassword) {
          reject(new Error('NEW_PASSWORD_REQUIRED'));
          return;
        }
        delete attrs.email_verified;
        delete attrs.email;
        user.completeNewPasswordChallenge(newPassword, attrs, {
          onSuccess: (session) => resolve(sessionToAdmin(email, session)),
          onFailure: (err) => reject(err),
        });
      },
    });
  });
}

export function signOut(): void {
  pool.getCurrentUser()?.signOut();
}

/** Returns a valid session if one is cached, refreshing tokens as needed. */
export function getCurrentSession(): Promise<AdminSession | null> {
  const user = pool.getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(sessionToAdmin(user.getUsername(), session));
    });
  });
}

export const isAdmin = (s: AdminSession): boolean =>
  s.groups.includes('event_admin') || s.groups.includes('super_admin');
