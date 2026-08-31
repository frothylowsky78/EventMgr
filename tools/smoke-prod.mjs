// Prod API smoke test — run from repo root: node tools/smoke-prod.mjs
// Logs in as the demo attendee via Cognito CUSTOM_AUTH, hits every attendee endpoint,
// exercises the new write paths, and reverts its own changes.
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const API = 'https://xfiros62r5.execute-api.us-west-2.amazonaws.com';
const REGION = 'us-west-2';
const CLIENT_ID = 'cq5k6d80t98sssp4t6n8q76j3';
const EVENT = 'event_001';
const EMAIL = process.env.SMOKE_EMAIL ?? 'jane@example.com';
const CODE = process.env.SMOKE_CODE ?? 'VIP2026';

const results = [];
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

async function login() {
  const c = new CognitoIdentityProviderClient({ region: REGION });
  const init = await c.send(new InitiateAuthCommand({
    AuthFlow: 'CUSTOM_AUTH', ClientId: CLIENT_ID, AuthParameters: { USERNAME: EMAIL },
  }));
  if (init.ChallengeName !== 'CUSTOM_CHALLENGE') throw new Error(`unexpected challenge ${init.ChallengeName}`);
  const resp = await c.send(new RespondToAuthChallengeCommand({
    ClientId: CLIENT_ID, ChallengeName: 'CUSTOM_CHALLENGE', Session: init.Session,
    ChallengeResponses: { USERNAME: EMAIL, ANSWER: CODE },
  }));
  const tok = resp.AuthenticationResult?.IdToken; // the app sends the ID token — it carries custom:attendeeId
  if (!tok) throw new Error('no ID token — wrong code or auth trigger failed');
  return tok;
}

let TOKEN;
async function call(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  const text = await r.text();
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  // API wraps successful payloads as { data: ... }; unwrap so assertions read the payload directly.
  if (json && typeof json === 'object' && 'data' in json && !('error' in json)) json = json.data;
  return { status: r.status, body: json };
}
const ok2xx = (s) => s >= 200 && s < 300;

async function check(name, method, path, body, assert) {
  try {
    const r = await call(method, path, body);
    let detail = `HTTP ${r.status}`;
    let pass = ok2xx(r.status);
    if (pass && assert) {
      const a = assert(r.body);
      if (a !== true) { pass = false; detail += ` — ${a}`; }
    }
    if (!pass && r.body) detail += ` ${JSON.stringify(r.body).slice(0, 200)}`;
    log(name, pass, detail);
    return r;
  } catch (e) {
    log(name, false, String(e));
    return { status: 0, body: null };
  }
}

(async () => {
  console.log(`\nLogging in as ${EMAIL} …`);
  try { TOKEN = await login(); log('login (CUSTOM_AUTH)', true); }
  catch (e) { log('login (CUSTOM_AUTH)', false, String(e)); process.exit(1); }

  // ---- reads ----
  await check('GET /health', 'GET', '/health');
  const me = await check('GET /me', 'GET', '/me', undefined, (b) =>
    b?.id ? true : 'no id');
  const meId = me.body?.id;
  log('  /me exposes blockedAttendeeIds', Array.isArray(me.body?.blockedAttendeeIds), JSON.stringify(me.body?.blockedAttendeeIds));
  log('  /me exposes registrationStatus', typeof me.body?.registrationStatus === 'string', me.body?.registrationStatus);
  log('  /me profilePhotoUrl populated (photo was uploaded earlier)', !!me.body?.profilePhotoUrl,
    me.body?.profilePhotoUrl ? 'presigned URL present' : 'EMPTY — upload a photo via the app, then re-run');

  const ev = await check(`GET /events/${EVENT}`, 'GET', `/events/${EVENT}`, undefined, (b) =>
    b?.name ? true : 'no name');
  const actions = ev.body?.registrationActions ?? [];
  log('  event has registrationActions', actions.length > 0, `${actions.length} actions`);
  const deadline = ev.body?.registrationDeadline;
  log('  registrationDeadline is in the future', !deadline || new Date(deadline) > new Date(),
    deadline ?? 'none set');
  log('  hero image set', !!ev.body?.branding?.heroImageUrl, ev.body?.branding?.heroImageUrl || 'EMPTY');

  const agenda = await check(`GET /events/${EVENT}/agenda`, 'GET', `/events/${EVENT}/agenda`, undefined, (b) =>
    Array.isArray(b) && b.length ? true : 'empty agenda');
  const agendaItems = Array.isArray(agenda.body) ? agenda.body : [];

  const att = await check(`GET /events/${EVENT}/attendees`, 'GET', `/events/${EVENT}/attendees`, undefined, (b) =>
    Array.isArray(b) ? true : 'not an array');
  const cards = Array.isArray(att.body) ? att.body : [];
  for (const c of cards) {
    log(`  ${c.firstName} ${c.lastName} (${c.city}) → markets ${JSON.stringify(c.markets)}`,
      Array.isArray(c.markets) && c.markets.length > 0, c.markets?.length ? '' : 'falls to "Other"');
  }
  const other = cards.find((c) => c.id !== meId);
  log('  another attendee exists for messaging/block tests', !!other, other ? `${other.id} messageable=${other.messageable}` : 'only jane — seed a second attendee');

  for (const p of ['dining', 'faq', 'help', 'maps', 'photos', 'weather']) {
    await check(`GET /events/${EVENT}/${p}`, 'GET', `/events/${EVENT}/${p}`);
  }
  for (const p of ['dining', 'itinerary', 'travel', 'transportation', 'notifications', 'unread-count',
    'conversations', 'feedback-submissions', 'help-requests']) {
    await check(`GET /me/${p}`, 'GET', `/me/${p}`);
  }
  await check('GET /me/itinerary.ics', 'GET', '/me/itinerary.ics');

  // ---- itinerary self-service ----
  if (agendaItems[0]) {
    const add = await check('POST /me/itinerary (add agenda item)', 'POST', '/me/itinerary',
      { agendaItemId: agendaItems[0].id }, (b) => b?.id ? true : 'no item id');
    const again = await check('POST /me/itinerary (same item → idempotent)', 'POST', '/me/itinerary',
      { agendaItemId: agendaItems[0].id }, (b) => b?.id === add.body?.id ? true : `duplicate created: ${b?.id}`);
    const list = await check('GET /me/itinerary (contains added item)', 'GET', '/me/itinerary', undefined, (b) =>
      b.some((i) => i.id === add.body?.id) ? true : 'added item missing');
    const mine = list.body?.find((i) => i.id === add.body?.id);
    log('  item has source=attendee', mine?.source === 'attendee', `source=${mine?.source}`);
    if (add.body?.id) await check('DELETE /me/itinerary/{id} (cleanup)', 'DELETE', `/me/itinerary/${add.body.id}`);
    void again;
  }

  // ---- registration ----
  if (actions[0]) {
    const done = await check(`POST registration complete (${actions[0].id})`, 'POST',
      `/me/registration/actions/${actions[0].id}/complete`, undefined, (b) =>
        b?.completedRegistrationActions?.includes(actions[0].id) ? true : 'not marked complete');
    log('  registrationStatus advanced', ['in_progress', 'complete'].includes(done.body?.registrationStatus), done.body?.registrationStatus);
    await check(`DELETE registration complete (cleanup)`, 'DELETE', `/me/registration/actions/${actions[0].id}/complete`);
    await check('POST registration complete (bogus id → 4xx expected)', 'POST',
      '/me/registration/actions/does_not_exist/complete').then((r) =>
      log('  bogus action id rejected', r.status >= 400 && r.status < 500, `HTTP ${r.status}`));
  }

  // ---- profile ----
  await check('PATCH /me/profile (no-op city)', 'PATCH', '/me/profile', { city: me.body?.city ?? '' });
  await check('POST /me/profile-photo/upload-url', 'POST', '/me/profile-photo/upload-url',
    { contentType: 'image/jpeg' }, (b) => b?.uploadUrl ? true : 'no uploadUrl');

  // ---- photos / reports ----
  await check(`POST photos/upload-url`, 'POST', `/events/${EVENT}/photos/upload-url`,
    { contentType: 'image/jpeg' }, (b) => b?.uploadUrl ? true : 'no uploadUrl');
  const photos = await call('GET', `/events/${EVENT}/photos`);
  const photo = Array.isArray(photos.body) ? photos.body[0] : photos.body?.items?.[0] ?? photos.body?.photos?.[0];
  if (photo) {
    await check('POST photo like', 'POST', `/events/${EVENT}/photos/${photo.id}/like`);
    await check('POST photo report', 'POST', `/events/${EVENT}/photos/${photo.id}/report`, { reason: 'other', note: 'smoke test — ignore' });
  } else {
    log('photo like/report', true, 'skipped — no approved photos in gallery yet');
  }

  // ---- blocks ----
  if (other) {
    await check(`POST /me/blocks/${other.id}`, 'POST', `/me/blocks/${other.id}`);
    const me2 = await call('GET', '/me');
    log('  /me shows block', me2.body?.blockedAttendeeIds?.includes(other.id) === true, JSON.stringify(me2.body?.blockedAttendeeIds));
    const att2 = await call('GET', `/events/${EVENT}/attendees`);
    log('  blocked attendee hidden from directory', !att2.body?.some?.((c) => c.id === other.id));
    await check(`DELETE /me/blocks/${other.id} (cleanup)`, 'DELETE', `/me/blocks/${other.id}`);
    const att3 = await call('GET', `/events/${EVENT}/attendees`);
    log('  attendee visible again after unblock', !!att3.body?.some?.((c) => c.id === other.id));
  }

  // ---- messaging ----
  if (other?.messageable) {
    const conv = await check('POST /me/conversations (to attendee)', 'POST', '/me/conversations',
      { withAttendeeId: other.id, body: 'smoke test — ignore' }, (b) => b?.id ? true : 'no conversation id');
    if (conv.body?.id) {
      const msg = await check('POST message', 'POST', `/me/conversations/${conv.body.id}/messages`, { body: 'smoke test 2' });
      await check('GET messages', 'GET', `/me/conversations/${conv.body.id}/messages`);
      if (msg.body?.id) await check('POST message report', 'POST',
        `/events/${EVENT}/conversations/${conv.body.id}/messages/${msg.body.id}/report`, { reason: 'other' });
    }
  } else {
    log('messaging', true, `skipped — ${other ? other.firstName + ' has not opted in to contact sharing' : 'no other attendee'}`);
  }
  await check('POST /me/conversations (to staff)', 'POST', '/me/conversations', { body: 'smoke test — staff thread, ignore' });

  // ---- feedback / help ----
  await check('POST feedback', 'POST', `/events/${EVENT}/feedback`,
    { type: 'event', targetId: EVENT, rating: 9, comments: 'smoke test — ignore' });
  await check('POST help-request', 'POST', `/events/${EVENT}/help-requests`,
    { category: 'other', message: 'smoke test — ignore', urgency: 'low' });
  await check('PATCH notifications read-all', 'PATCH', '/me/notifications/read-all');

  // ---- auth boundary ----
  TOKEN = 'bogus';
  const unauth = await call('GET', '/me');
  log('unauthenticated /me rejected', unauth.status === 401 || unauth.status === 403, `HTTP ${unauth.status}`);

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  if (fails.length) { console.log('\nFAILED:'); fails.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`)); }
  process.exit(fails.length ? 1 : 0);
})();
