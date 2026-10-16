# Lumen TV

A private media and application console for LG webOS televisions, with a Go companion service and optional ESP32 infrared firmware. Lumen provides its own ad-free screens for a local video library, music playback, photographs, a clock, focus intervals, encrypted notes, and playlists. Installed application shortcuts use the webOS Application Manager when the official LG SDK is available.

The client uses React and TypeScript. The companion uses Go's standard library. The infrared bridge uses C, FreeRTOS, and the ESP-IDF RMT peripheral. These components keep display navigation, storage, device admission, and physical control separate.

## Capabilities

- Spatial arrow-key navigation, pointer selection, focus restoration, and LG Back and media keys.
- Catalog views for video, audio, photographs, installed app shortcuts, saved items, and resume points.
- Signed media URLs, byte-range streaming, playback checkpoints, expired-ticket renewal, and a photo slideshow.
- Expiring pairing codes, hashed display tokens, per-device progress, immediate revocation checks, optional AES-GCM state encryption, and atomic snapshots.
- A Privacy Center for retention, history erasure, exports, and opt-in local pairing and catalog persistence.
- Built-in focus timer, encrypted scratchpad, versioned playlists, and an explicit compiled application registry.
- Cached catalog browsing during companion outages; media streaming still requires the companion.
- webOS metadata, relative asset builds, generated packaging icons, SDK staging, and installation scripts.
- Optional infrared firmware with extended NEC encoding, 38 kHz carrier generation, CRC-framed UART commands, and a small duplicate-command cache.

## Repository

```text
client/src/             TV interface, navigation, player, gallery, platform adapter
server/cmd/lumend/      Companion process and configuration
server/internal/       Catalog validation, sessions, persistence, media tickets, HTTP API
platform/webos/        LG application metadata and optional vendor SDK location
firmware/ir-bridge/     ESP32 RMT and UART firmware
tools/irctl.py          Serial host control tool
scripts/               webOS staging and install commands
config/                Catalog example and JSON schema
docs/                  Architecture, protocols, installation, hardware notes
```

## Companion

Requires Go 1.22 or newer. Run from `server`:

```sh
go run ./cmd/lumend
```

The service listens at `127.0.0.1:8090` and prints a pairing code valid for ten minutes. Restarting opens a new pairing window. Paired display sessions last thirty days. The service reads `../config/catalog.json`, opens media under `../media`, and stores state and a signing key in `server/data`. Set `LUMEN_STATE_KEY` to a 64-character hexadecimal secret for snapshot encryption. Set a separate random `LUMEN_ADMIN_TOKEN` of at least 32 characters to enable owner administration. See [security and privacy](docs/security.md) before configuring these features.

The example catalog references personal files without bundling them. Supply those files or change the catalog. A missing media file produces an unavailable response at playback time. Changes to the catalog are loaded on companion restart.

For a TV on your LAN, bind the companion explicitly and allow the packaged app origin:

```sh
LUMEN_ADDR=0.0.0.0:8090 LUMEN_ORIGINS='null,http://127.0.0.1:5173' go run ./cmd/lumend
```

Enter the computer's LAN address on the TV, such as `http://192.168.1.20:8090`. Loopback addresses refer to the device itself. The sample uses HTTP for a trusted local network. Configure HTTPS through a trusted local reverse proxy when transport confidentiality is required; pairing tokens and signed links otherwise travel in plaintext. Do not forward this service's port to the Internet. Allowing the `null` origin permits other opaque-origin documents too, so the pairing and bearer checks remain mandatory.

Environment variables are listed in [.env.example](.env.example); the program reads exported variables and does not automatically load dotenv files.

## TV client

Requires Node.js 22.12 or newer and npm. From `client`:

```sh
npm install
npm run dev
```

The development UI runs at `http://127.0.0.1:5173`. Pair using the companion address and its terminal code. Pairing and catalog persistence are off by default; enable them through the Privacy Center if desired. `npm run build` creates the packaged frontend assets. The JavaScript target is Chromium 87; this does not certify a specific TV model or codec combination.

To stage the TV package from the repository root:

```sh
python3 scripts/stage-webos.py
python3 scripts/stage-webos.py --package
```

The second command requires LG's `ares-package` CLI. It produces an IPK under `build/`. Configure your TV through LG's Developer Mode flow and then run:

```sh
scripts/install-tv.sh YOUR_DEVICE build/YOUR_PACKAGE.ipk
```

Native app shortcuts and platform exit need the official `webOSTV.js` placed in `platform/webos/vendor`. The staging script includes it only when present. See [TV installation](docs/webos.md).

## Firmware

The optional bridge targets a classic ESP32 board with ESP-IDF 5.1 APIs. It uses UART1 for control and UART0 for diagnostics and flashing. From `firmware/ir-bridge`, after enabling the ESP-IDF environment:

```sh
idf.py set-target esp32
idf.py menuconfig
idf.py build
idf.py -p YOUR_FLASH_PORT flash monitor
```

The default pins are IR output GPIO4, UART1 TX GPIO17, and RX GPIO16. Board pin reservations and IR driver hardware must be checked before use. The bridge requires a separate UART1 connection for commands. See [hardware and wire protocol](docs/firmware.md).

## Scope and status

Lumen is a webOS application and companion system. The optional microcontroller component contains the firmware. There is no LG boot image, privileged launcher replacement, or television firmware flashing path. Ad-free behavior applies to Lumen's own interface and your chosen media. External app shortcuts preserve the launched application's behavior.

The repository contains implementation code and packaging definitions. Builds, TV installation, codec playback, remote behavior, and board operation have not been validated. Media files, vendor SDK files, and compiled firmware are not included. The UART tool is operated separately and is not wired into the Go HTTP API or TV interface.

Design details: [architecture](docs/architecture.md), [companion API](docs/api.md), [TV integration](docs/webos.md), [firmware protocol](docs/firmware.md), [applications](docs/applications.md), and [security](docs/security.md).
