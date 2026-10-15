# Architecture

## Display runtime

The TV loads a packaged React application. A single route state selects the library, player, gallery, clock, focus timer, scratchpad, playlists, or privacy center. Spatial navigation evaluates live element rectangles, selects candidates in the requested half-plane, favors overlapping rows or columns, and restores a catalog card after returning from playback. Native input fields keep their editing keys. Numeric key codes supplement browser key names for TV remotes.

Pairing holds the companion origin, bearer token, device ID, and expiration in memory. The Privacy Center can opt into local pairing persistence. Catalog caching is also opt-in; cached metadata expires after seven days. Resume points are owned by a paired device on the companion. Saved-item choices are local to the display and remain when pairing changes.

Catalog refreshes use abortable requests. The application aborts stale requests on session changes. A failed catalog request may fall back to cached metadata; cached video cards do not imply offline playback. A 401 response clears the local session and asks for pairing again.

## Media path

The authorized API exchanges an entry ID for a signed URL restricted to one media resource and device label for five minutes. The video and image elements can request that URL without putting the long-lived bearer token into their source attributes. HTTP range requests are served by Go's `ServeContent`; file bytes are not buffered into application memory.

Ticket validation occurs when each request begins. An established stream can continue after expiration. Subsequent range requests need a new ticket. The player preserves its position when renewing a URL, performs one automatic renewal after an expired-ticket error, and exposes a manual renew control. Device revocation blocks new requests using previously issued tickets; already open streams can finish.

Progress writes run every fifteen seconds and on explicit pause, end, close, and visibility changes. They are best effort and not queued offline, avoiding stale queued writes overwriting a newer position later. Closing the runtime abruptly can lose recent progress. Durations and positions are validated by the server. Container and codec compatibility depends on the specific television; there is no transcoder or adaptive HLS pipeline.

## Catalog and persistence

Catalog entries use immutable IDs, a kind, descriptive fields, and either a relative media file or an installed application ID. The service rejects duplicate IDs, path traversal, unsupported file extensions, and mismatched MIME declarations. Files are resolved under the configured root, including a symlink containment check. Administrators must keep the media tree under trusted ownership; the implementation does not promise race-free containment against a local user swapping symlinks during a request.

The state store holds device hashes, per-device resume maps, versioned playlists, privacy policies, and bounded audit events. Optional AES-GCM encryption wraps each persisted snapshot. Mutations serialize through a mutex, deep-copy the snapshot, apply a change, write and sync a sibling temporary file, and rename it over the state file. Failed writes preserve the in-memory prior state. Directory syncing is best effort. Run one companion process per data directory. There is no replication or multi-process transaction protocol.

## Device boundary

The webOS adapter exposes only installed application launch and platform Back through LG's public SDK surface. It reports a missing SDK or rejected Luna request explicitly. The catalog cannot install packages or obtain privileged application permissions.

The optional ESP32 accepts bounded serial frames and generates extended NEC waveforms. Its duplicate cache covers the last eight accepted sequences until reset. The firmware latches an RMT transmission error rather than automatically replaying a potentially completed command. UART framing checks integrity, not sender identity; its physical connection is trusted. No Wi-Fi provisioning or OTA update subsystem is implemented.

## Load boundaries

Catalogs are limited to 1000 entries and roughly 1 MiB of input. JSON API bodies are limited to 64 KiB, pairing attempts to five per source address per minute, paired displays to 32, and resume maps to 1000 items per display. There is no distributed limiter. At most four media requests are admitted concurrently. Media connections do not use a short global response timeout because that would interrupt playback; a production multi-user deployment would require per-client bandwidth management beyond this local service.
