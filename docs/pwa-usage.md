# PWA Usage

The app includes a web app manifest and service worker so it can behave like a lightweight PWA when served correctly.

## Opening The App

For normal browser use, open the app through an HTTP or HTTPS server. PWA installation and service worker behavior generally do not work reliably from a direct `file://` path.

For local testing, any simple static server can serve the folder.

## Install To Home Screen

Install behavior depends on browser and operating system.

On mobile browsers, look for actions such as:

- Add to Home Screen;
- Install App;
- Save to Home Screen.

On desktop browsers, an install icon may appear in the address bar when the page is served over HTTP or HTTPS.

## What The PWA Can Do

The current service worker caches the app shell:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `icon.svg`

This can make the interface available after the first successful load.

## Limits

- Offline behavior depends on browser support and cache state.
- User data still lives in browser storage.
- The app does not provide cloud sync.
- AI features need network access and a working provider.
- Clearing browser data may remove both cached app files and saved study records.

## Updating

If the app appears stale after an update:

- refresh the page;
- close and reopen the browser tab;
- clear site data if necessary;
- unregister the service worker from browser developer tools if the cache is stuck.

