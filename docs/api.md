# Companion protocol version 1

The default companion origin is `http://127.0.0.1:8090`. JSON errors use `{"error":"message"}`. Authenticated API routes require `Authorization: Bearer TOKEN`. CORS origins are explicitly configured; requests without an Origin header still require their route's authentication. HEAD is supported for GET routes by the Go router.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/health` | Protocol version, readiness, and catalog size |
| POST | `/api/pair` | Redeem a startup code for a display session |
| GET | `/api/catalog` | Canonical entries without host file paths |
| GET | `/api/progress` | Resume map for the authenticated display |
| PUT | `/api/progress/{id}` | Update a playable entry's resume point |
| POST | `/api/media/{id}/ticket` | Mint a short-lived media capability |
| GET / PUT | `/api/privacy` | Read or update history recording and retention |
| DELETE | `/api/progress` | Erase all display resume points |
| GET | `/api/export` | Export this display's settings, history, and playlists |
| GET / PUT | `/api/playlists` | List or version-check a playlist save |
| DELETE | `/api/playlists/{id}` | Remove a playlist owned by this display |
| GET | `/api/admin/devices` | Administrator device inventory |
| GET | `/api/admin/audit` | Administrator metadata event log |
| DELETE | `/api/admin/devices/{id}` | Administrator session revocation |
| DELETE | `/api/session` | Revoke the display session and erase its progress and playlists |
| GET | `/media/{id}` | Stream a local file with a valid signed capability |

## Pair

Request:

```json
{"code":"123456","name":"Living room TV"}
```

The six-digit code is generated at startup and expires after ten minutes. The response contains `token`, `deviceId`, and Unix-seconds `expires`. The same startup code can pair multiple displays within that window, up to the configured fixed capacity. Tokens have 256 random bits and are stored as SHA-256 hashes. Restarting rotates the pairing code while existing unexpired display sessions remain valid.

## Resume

```json
{"position":120.5,"duration":3600}
```

Values are seconds. Position must be nonnegative and no greater than duration; duration must be positive and no more than seven days. Successful updates return 204. Writes are last-writer-wins for a device and media ID. The returned map includes a server `updated` timestamp.

## Media tickets

A ticket response contains a relative `path` and Unix-seconds `expires`. Its query contains `device`, `expires`, and `sig`. The HMAC signature binds protocol, entry ID, device ID, and expiry. It grants the specific file; it is not a general API credential. The signature key is created once with mode 0600 under the data directory. Changing or losing that key invalidates all issued tickets.

Media responses set an explicit MIME type, `nosniff`, and private no-store caching. Seeking uses normal Range requests. Unsupported or missing catalog entries return 404. An invalid or expired ticket returns 403. Local file names and tokens are not written to access logs by this service; a reverse proxy must apply equivalent query-string redaction if it logs media URLs.

## Status conventions

400 denotes invalid JSON or domain input, 401 an absent or invalid display session, 403 a rejected origin/code/ticket, 404 an unavailable item, 429 pairing throttling, and 503 a persistence or capacity failure. The API never accepts an arbitrary upstream URL, host path, or shell command.

## Owner administration

Administrative routes use the separate `LUMEN_ADMIN_TOKEN` bearer credential and are disabled when it is absent. `tools/admin.py` reads that secret from the environment. It can list displays, inspect the bounded audit trail, and revoke a display by ID. Display session tokens have no administrative privileges.

```sh
python3 tools/admin.py devices
python3 tools/admin.py audit
python3 tools/admin.py revoke --device YOUR_DISPLAY_ID
```

A playlist save includes `id`, `name`, `entries`, and `version`. Create with an empty ID and version zero. Updates must provide the last observed version; a conflict returns 409. History policy JSON contains `recordHistory` and `retentionDays` (1 to 90). Disabling recording erases existing resume points. Exports omit credentials and other displays' data.
