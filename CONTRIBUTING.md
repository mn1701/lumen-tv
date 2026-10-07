# Development notes

Use Node.js 22.12 or newer, Go 1.22 or newer, and the ESP-IDF environment appropriate for the optional bridge. `.nvmrc` selects the Node 22 release line. Run `make client-build`, `make companion`, or `make tv-stage` from the repository root.

Keep catalog identities stable when changing media locations. Private media belongs in the ignored media directory. Store companion data in the ignored server data directory. Pass owner and state-encryption secrets through the environment. Do not include device credentials, local media, compiled packages, or vendor SDK files in commits.

Built-in applications are registered as compiled modules. Preserve the boundary between catalog metadata and executable application code. Firmware operations use a separate UART tool; the TV client does not directly flash hardware.

Document any change to pairing, media capability expiry, retention, or snapshot encryption in `docs/security.md` and the API contract. State model changes need an explicit migration path from existing version-1 snapshots. Hardware-dependent behavior should state the model and environment on which it was observed.
