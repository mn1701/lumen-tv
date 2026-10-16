# LG webOS integration

Lumen uses LG's packaged web app model. `appinfo.json` identifies `io.mn1701.lumen.tv`, points to `index.html`, supplies icon paths, and enables direct Back handling with `disableBackHistoryAPI`. It uses no privileged service permissions. Staging generates the mandatory 80 pixel icon and optional 130 pixel icon, copies the Vite output, and includes the official LG JavaScript SDK only if provided.

## Device setup

Install LG's Developer Mode app on the TV, follow LG's sign-in and Developer Mode instructions, and register the device with LG's supported CLI or webOS Studio. Configure the SDK key through that tool's documented device flow. The repository does not automate credentials, root access, or Developer Mode session renewal. Application lifetime and Developer Mode expiration remain governed by the TV's settings.

The companion must be reachable at the computer's LAN origin, not `127.0.0.1` from the TV. Permit the app's actual request Origin in `LUMEN_ORIGINS`. A packaged file-origin app may send `null`; explicitly enabling that origin is a deployment choice and still requires bearer authentication. HTTPS certificate trust and mixed-content behavior must be evaluated on the target model.

## Remote handling

Directional keys select focusable controls through spatial navigation. Enter activates standard HTML buttons. The Back event uses LG's numeric key code 461 and browser Escape in development. Play, Pause, and Stop use codes 415, 19, and 413. Pointer navigation and native video controls remain available. At the library root, Back delegates to `webOS.platformBack` when the SDK is loaded. Without the SDK, root Back has no platform-exit action.

## Installed application shortcuts

Add a catalog entry with kind `native` and its actual installed `appId`. Lumen calls `webOS.service.request` on `luna://com.webos.applicationManager` with method `launch`. Launch behavior is subject to the app's installation state, platform permissions, model, and Developer Mode restrictions. Shortcut IDs must be supplied by the owner; the project does not claim access to a complete system-app inventory. Applications launched this way retain their own advertisements, subscriptions, and playback rules.

## Compatibility

The build targets Chromium 87 syntax and uses HTML media elements. The target does not add unsupported browser APIs, codecs, DRM systems, or model-specific permissions. All installation and playback behavior requires hardware validation. Older webOS versions may need additional build transforms and platform adapters.

Official references:

- [App metadata](https://webostv.developer.lge.com/develop/references/appinfo-json)
- [Web app types](https://webostv.developer.lge.com/develop/getting-started/web-app-types)
- [Application Manager](https://webostv.developer.lge.com/develop/references/application-manager)
- [Magic Remote keys](https://webostv.developer.lge.com/develop/guides/magic-remote)
- [Back handling](https://webostv.developer.lge.com/develop/guides/back-button)
- [webOS Studio device setup](https://webostv.developer.lge.com/develop/tools/webos-studio-dev-guide)
