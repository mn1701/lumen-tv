# Application host

The TV shell hosts compiled React modules registered in `client/src/apps/registry.ts`. This registry is an explicit execution boundary: a server catalog entry can select local media or an installed native application ID, but cannot supply scripts, iframe URLs, or a downloaded plugin. Modules receive only the callbacks and companion API instance they need.

| Application | State | Companion access |
| --- | --- | --- |
| Library and player | Catalog metadata, resume positions, saved-item IDs | Catalog, tickets, progress |
| Photo slideshow | Current selection and timer in memory | Image tickets |
| Clock | Current local time | None |
| Focus timer | Deadline, paused remainder, session counter | None |
| Locked scratchpad | Encrypted local envelope; unlocked text in memory | None |
| Playlists | Versioned per-display collections | Playlist API and catalog |
| Privacy Center | Local choices and server history policy | Privacy, export, erase history |

The focus timer calculates remaining time from a deadline instead of decrementing an assumed interval. When the browser wakes after a background delay, it completes at most one interval and waits for explicit restart. It does not create sessions while the TV is suspended. Closing the module discards its timer state.

Playlists preserve the selected entry order and allow individual items to open in the existing player. Continuous queue playback, shuffle, and audio crossfade are not implemented. Concurrent edits are rejected by server version checks; reload before editing after a conflict. An unavailable catalog ID is rejected on save and shown as unavailable when browsing an older list.

Native app shortcuts are platform launches. Their advertisements and privacy settings belong to the launched application. Lumen's own screens include no ad SDK, analytics SDK, third-party font requests, or advertising inventory. This describes the authored source; a deployed companion and any externally installed application remain separate trust boundaries.
