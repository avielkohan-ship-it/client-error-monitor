# client-error-monitor

Watches your clients' bookings and voice calls for failures, tries to fix
them automatically, and texts/pushes you when something needs attention.

## What it detects

- **Failed bookings** — from Cal.com (cancellations, rejections, failed
  payments, no-shows) or Open Dental: an explicit failure, or a "success"
  with no confirmed time.
- **Bad call endings** — from a Retell AI voice agent: abrupt hangups, no
  answers, silence timeouts, call errors, or a "completed" call that was
  suspiciously short.

## What it does about it

1. **Detect** — an incoming event is classified as an error or not
   (`src/detectors/`).
2. **Auto-fix** — if the client has a retry endpoint configured
   (`config/clients.json`), the service retries the booking or requests a
   callback, with exponential backoff (`src/autofix/`).
3. **Notify** — you get a push notification (ntfy.sh, no account needed)
   and/or a text (Twilio, if you set one up) either way, saying whether the
   auto-fix worked or a human needs to step in (`src/notify/`).
4. **Log** — every error and its outcome is stored in `data/errors.json` and
   viewable at `GET /errors`.

## Setup

```bash
npm install
cp .env.example .env            # fill in Twilio and/or ntfy.sh settings
cp config/clients.example.json config/clients.json   # add your clients
npm run dev
```

### Notifications

- **Push (recommended, no account needed)**: pick a unique topic name, e.g.
  `aviel-client-errors-8k2j`, subscribe to it in the
  [ntfy app](https://ntfy.sh/) (iOS/Android/web), and set `NTFY_TOPIC` to
  that name in `.env`.
- **SMS (optional)**: only if you set up your *own* Twilio account (this is
  separate from the Twilio number Retell AI uses for your voice agent — that
  number can't be reused to text you). Create a Twilio account, buy a
  number, and set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM_NUMBER`, and `NOTIFY_PHONE_NUMBER` (your phone, in E.164
  format like `+15551234567`).

Either channel can be left blank to disable it; the other still fires.

### Per-client config

Edit `config/clients.json` (gitignored — copy it from the `.example` file).
One entry per practice, keyed by an `id` you choose (used in the webhook
URLs below):

- `calcomWebhookSecret` — the signing secret you set on this practice's
  Cal.com webhook.
- `retellWebhookSecret` — the signing secret for this practice's Retell
  agent's webhook.
- `bookingRetryUrl` / `bookingRetryHeaders` — where to re-POST a failed
  booking to auto-fix it (optional).
- `callCallbackUrl` / `callCallbackHeaders` — where to request an outbound
  callback after a bad call, to auto-fix it (optional).

A client missing the retry/callback URLs still gets detected and notified —
it just skips the auto-fix step for that error type.

## Wiring up Cal.com (per practice)

For each practice's Cal.com account:

1. Go to **Settings → Developer → Webhooks → Add**.
2. Subscription URL: `https://<your-deployment>/webhooks/calcom/<clientId>`
   (use the same `id` you gave this practice in `config/clients.json`).
3. Pick events: at minimum **Booking Cancelled**, **Booking Rejected**,
   **Booking Payment Initiated**, **Booking No-Show Updated**.
4. Set a secret, and copy the same value into that client's
   `calcomWebhookSecret` in `config/clients.json`.

Cal.com's exact webhook payload can vary by plan/version — `src/adapters/calcom.ts`
documents the shape it expects. If a real payload doesn't match (check the
webhook's delivery log in Cal.com for a sample), adjust that file.

## Wiring up Retell AI (per practice)

For each practice's Retell agent:

1. In the Retell dashboard, set the agent's **Webhook URL** to
   `https://<your-deployment>/webhooks/retell/<clientId>`.
2. Copy the agent's webhook signing secret into that client's
   `retellWebhookSecret` in `config/clients.json`.

`src/adapters/retell.ts` maps Retell's `disconnection_reason` values (e.g.
`dial_no_answer`, `dial_busy`, `error_no_audio_received`) to this service's
error categories. If Retell's actual payload differs from what's documented
there (check Retell's webhook logs for a sample), adjust the mapping.

## Other sources (Open Dental, etc.)

The generic endpoints still work for any source that isn't Cal.com/Retell:

- `POST /webhooks/booking`
  ```json
  {
    "clientId": "example-clinic",
    "source": "opendental",
    "status": "failed",
    "patientOrCustomerName": "Jane Doe",
    "requestedTime": "2026-09-10T15:00:00Z",
    "errorMessage": "double booked"
  }
  ```
- `POST /webhooks/call`
  ```json
  {
    "clientId": "example-clinic",
    "callId": "call_123",
    "durationSeconds": 4,
    "endReason": "hangup_abrupt"
  }
  ```

If a source sends a different payload shape, write a small adapter for it
under `src/adapters/` (following `calcom.ts`/`retell.ts` as examples) rather
than changing these generic routes.

Set `WEBHOOK_SECRET` and require it as the `X-Webhook-Secret` header on the
generic routes if they're reachable from the public internet. The
Cal.com/Retell routes are authenticated per-client via their own signature
instead.

## Viewing errors

- `GET /errors` — all recorded errors, newest first.
- `GET /errors/:id` — a single error record, including what was tried and
  whether you were notified.

## Where to take this next

- Swap the JSON file store (`src/store.ts`) for a real database once you have
  more than a handful of clients.
- Add a small web dashboard on top of `GET /errors`.
- Add more detectors (e.g. double-bookings, no-shows) alongside the existing
  ones in `src/detectors/`.

## Development

```bash
npm test    # run the test suite
npm run build
```
