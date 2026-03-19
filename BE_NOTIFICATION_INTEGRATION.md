# Backend Integration: System Notifications

This document defines the backend contract needed by the frontend notification system.

## What FE Already Does

- Shows a **compact bottom-right prompt on first visit** when `Notification.permission === "default"`, with **Enable** / **Not now** (dismiss stored in `localStorage` key `SystemNotificationPromptDismissed`).
- **Does not** call `Notification.requestPermission()` when a server notification arrives — only the banner (or your own UI calling `requestPermission`) triggers the browser prompt, so users see the option as soon as they land.
- Polls backend periodically for new notifications (when logged in).
- Uses browser system notifications via Web Notifications API when permission is **granted**.
- Falls back to toast notifications when permission is denied/unavailable.
- Acknowledges delivered notifications back to backend.

Frontend provider file: `contexts/SystemNotificationContext.js`

## Trigger a notification from the frontend (any component or helper)

Import the shared helper (no hook required):

```js
import { triggerLocalNotification } from "../util/triggerLocalNotification";

await triggerLocalNotification({
  title: "Export finished",
  body: "Your file is ready to download.",
  url: "/reports", // optional: opens when user clicks the notification
  tag: "export-123", // optional: replace/update same tag
});
```

Options:

```js
await triggerLocalNotification(
  { title: "Saved", body: "Draft stored." },
  { shouldToastFallback: true, onClickUrl: "/purchase-order" }
);
```

Or use the React hook inside the provider tree:

```js
const { triggerLocalNotification } = useSystemNotifications();
await triggerLocalNotification({ title: "Done", body: "OK" });
```

Same payload shape as server-driven notifications (`title`, `body`, `url`, `icon`, `tag`, `id`, etc.). Does **not** request permission; falls back to **toast** if notifications are blocked or unsupported.

## Environment Variables (Frontend)

Add these in FE `.env`:

```env
NEXT_PUBLIC_NOTIFICATIONS_PULL_PATH=/notifications/pull
NEXT_PUBLIC_NOTIFICATIONS_ACK_PATH=/notifications/ack
NEXT_PUBLIC_NOTIFICATIONS_POLL_MS=15000
```

Notes:
- Paths are appended to existing `NEXT_PUBLIC_API_URL`.
- Poll interval defaults to `15000` ms if omitted.

## API Contracts

### 1) Pull notifications

`GET /notifications/pull?after=<cursor>&limit=<n>`

Purpose:
- Return undelivered/new notifications for logged-in user.
- Ordered oldest -> newest.

Auth:
- Uses existing FE header: `x-access-token`.

Query params:
- `after` (optional): cursor/id/timestamp from last fetched event.
- `limit` (optional): max records requested (FE sends 30).

Accepted response shapes (any one is fine):

```json
[
  {
    "id": "notif_1001",
    "title": "PO Approved",
    "body": "PO #PO-1234 approved by Manager",
    "url": "/purchase-order/view/PO-1234",
    "icon": "/favicon.ico",
    "tag": "po_approved_PO-1234",
    "requireInteraction": false,
    "silent": false,
    "created_at": "2026-03-12T10:00:00.000Z",
    "data": {
      "entity": "purchase_order",
      "entity_id": "PO-1234"
    }
  }
]
```

or

```json
{
  "data": [/* same objects */]
}
```

or

```json
{
  "notifications": [/* same objects */]
}
```

### 2) Acknowledge delivered notifications

`POST /notifications/ack`

Body:

```json
{
  "ids": ["notif_1001", "notif_1002"]
}
```

Purpose:
- Mark notifications as delivered/seen by FE polling cycle to avoid repeats.

Recommended response:

```json
{
  "success": true
}
```

## Required Notification Fields

Minimum:
- `id` (string, unique)
- `title` (string)
- `body` (string)

Recommended:
- `url` (string): opens on notification click.
- `created_at` (ISO string): useful as cursor.
- `tag` (string): allows browser-level dedup/replacement.
- `data` (object): metadata for future use.

## Cursor Strategy (Backend)

Pick one and keep it stable:
- Monotonic `id`, or
- `created_at` timestamp.

When `after` is passed:
- Return only notifications strictly greater/newer than `after`.
- Return sorted ascending by time.

## BE Agent Checklist

- Implement `GET /notifications/pull`.
- Implement `POST /notifications/ack`.
- Ensure both endpoints honor `x-access-token` user context.
- Ensure dedupe safety by stable `id`.
- Return notifications in ascending chronological order.
- Add DB fields: `id`, `user_id`, `title`, `body`, `url`, `created_at`, `acknowledged_at` (recommended).

## Quick Manual Test

1. Login in FE.
2. Ensure browser notification permission is granted.
3. Insert one test notification in DB for that user.
4. Wait one poll cycle (15s default) or refresh app.
5. Confirm system notification appears.
6. Confirm backend receives `POST /notifications/ack` with that notification id.
