# client-error-monitor

Watches your clients' bookings and voice calls for failures, tries to fix
them automatically, and texts/pushes you when something needs attention.

## What it detects

- **Failed bookings** — from booking systems like Carl.com or Open Dental:
  an explicit failure, or a "success" with no confirmed time.
- **Bad call endings** — abrupt hangups, silence timeouts, call errors, or a
  "completed" call that was suspiciously short.

## What it does about it

1. **Detect** — an incoming event is classified as an error or not
   (`src/detectors/`).
2. **Auto-fix** — if the client has a retry endpoint configured
   (`config/clients.json`), the service retries the booking or requests a
   callback, with exponential backoff (`src/autofix/`).
3. **Notify** — you get a text (Twilio) and/or a push notification (ntfy.sh)
   either way, saying whether the auto-fix worked or a human needs to step in
   (`src/notify/`).
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

- **SMS**: create a Twilio account, buy a number, and set
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and
  `NOTIFY_PHONE_NUMBER` (your phone, in E.164 format like `+15551234567`).
- **Push**: no account needed. Pick a unique topic name, e.g.
  `aviel-client-errors-8k2j`, subscribe to it in the
  [ntfy app](https://ntfy.sh/) (iOS/Android/web), and set `NTFY_TOPIC` to
  that name.

Either channel can be left blank to disable it; the other still fires.

### Per-client auto-fix config

Edit `config/clients.json` (gitignored — copy it from the `.example` file).
Each client needs an `id` that matches the `clientId` your booking/voice
system sends in its webhook, plus whichever of these it has:

- `bookingRetryUrl` / `bookingRetryHeaders` — where to re-POST a failed
  booking.
- `callCallbackUrl` / `callCallbackHeaders` — where to request an outbound
  callback after a bad call.

A client with neither configured still gets detected and notified — it just
skips the auto-fix step.

## Wiring up your sources

Point your booking system / voice platform's webhooks at:

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

If Carl.com / Open Dental / your voice platform send a different payload
shape, add a small translator in front of these routes (or extend
`src/routes/webhooks.ts`) rather than changing the webhook contract.

Set `WEBHOOK_SECRET` and require it as the `X-Webhook-Secret` header if
these endpoints are reachable from the public internet.

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
