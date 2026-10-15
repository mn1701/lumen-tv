# Security and privacy model

## Trust boundaries

Lumen assumes a trusted companion host and an explicitly configured LAN origin. Display sessions are bearer capabilities with a thirty-day expiry. Their hashes are stored in the state snapshot; plaintext tokens are returned only during pairing and held by the TV client. Pairing codes expire ten minutes after companion startup and are subject to per-address attempt limits. A pairing code can enroll more than one display during its window.

Administration is disabled unless `LUMEN_ADMIN_TOKEN` contains at least 32 characters. The administrator token is separate from display credentials and is never embedded in the client. It permits device listing, metadata audit inspection, and session revocation through the companion API. Prefer a randomly generated value and HTTPS for transport. The administrative tool reads the secret from the environment rather than command arguments. The server assumes direct client connections for rate limiting and does not trust forwarded address headers.

Display tokens cannot enumerate or revoke other displays. Resume history, exports, and playlists are scoped to the authenticated device. Playlists use optimistic versions and return 409 on a stale save. Each display is bounded to fifty playlists with one hundred entries each. The service accepts catalog IDs, not arbitrary upstream URLs, application scripts, or host paths.

## Signed media and revocation

Media capabilities bind the catalog ID, device ID, and five-minute expiry using HMAC-SHA256. Every new media request also checks that the device is present and unexpired. Revoking a display therefore blocks subsequent ticket and range requests. An already open stream can finish; there is no forced socket interruption. Media responses use `private, no-store`. Four simultaneous media requests are admitted, with excess requests receiving 503.

Catalog extension and MIME allowlists prevent serving arbitrary executable documents as library entries. Canonical paths and symlink checks constrain files to the media root. A malicious local filesystem writer can still race the check, so ownership of that directory is part of the trust model. The local service does not provide transcoding, malware scanning, or authentication for a reverse proxy.

## Snapshot encryption

Set `LUMEN_STATE_KEY` to exactly 64 hexadecimal characters to encrypt state snapshots with AES-256-GCM. A fresh random nonce is generated for each write, and the format label is authenticated as associated data. The key is supplied separately through the environment and is not written into the encrypted snapshot. Wrong keys and damaged encrypted snapshots fail at startup. Existing plaintext snapshots are read and migrate at the next successful write; the startup retention sweep performs that write.

The media-signing key remains a separate mode-0600 file. State encryption protects the current state file against disclosure without its key. It does not hide media files, filenames in the catalog, process memory, environment values, filesystem metadata, previously saved plaintext files, or backups. Key loss means the encrypted state cannot be recovered. Only one companion process may own a data directory.

## Playback privacy

The Privacy Center can disable recording and erase existing resume points. It also supports one to ninety days of history retention and a per-display data export. Reads filter expired history immediately; a background sweep removes expired records and sessions every ten minutes. Application shutdown can interrupt an in-flight write. Explicitly saved playlists are retained until deleted or the display is revoked; playback-retention settings do not erase them.

Pairing persistence and catalog caching are off by default. The current session remains in memory unless the owner chooses to remember it. Catalog caching, description visibility, and local browsing-data removal are separate display choices. Saved-item IDs are local browser preferences. Clearing browser storage does not revoke a server-side session; use Unpair or administrative revocation for that operation.

## Locked scratchpad

Notes use browser Web Crypto with PBKDF2-SHA256, a random 128-bit salt, 310000 iterations, AES-256-GCM, and a fresh 96-bit IV for each save. A fixed protocol label is authenticated. Only the encrypted envelope is written to local storage; passwords and plaintext are not sent to the companion. Text is cleared from application state on backgrounding, manual lock, close, and at five-minute intervals. JavaScript does not provide reliable physical memory erasure, and compromised same-origin code can access unlocked content.

The runtime must expose Web Crypto in its current origin. Unsupported TV or insecure contexts fail without a plaintext fallback. A weak password remains vulnerable to offline guessing. There is no note recovery flow, password reset, remote sync, or key escrow. Delete the encrypted note inside the scratchpad; the browsing-data button intentionally covers pairing, catalog, and favorite data only.

## Audit records

The encrypted-or-plaintext state snapshot includes at most 256 administrative event records retained for up to thirty days. Events contain a timestamp, fixed event kind, and opaque device ID. They never contain bearer tokens, pairing codes, media URLs, file paths, note content, playlist names, or playback positions. The log is a local operational trail, not a tamper-evident ledger. Compromising the companion host defeats its integrity.

Reference APIs: [Go AEAD](https://pkg.go.dev/crypto/cipher) and [Web Crypto key derivation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey). Build, cryptographic integration, model-specific behavior, and hardware operation still require validation.
