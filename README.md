# danielmente

An installable, local-first iPhone healthy-habit dashboard.

## Features
- Sleep entry with calculated hours and 14-day trend
- Weight milestones from 260 to 230 lb and 7-day moving average
- Movement minutes with daily goal and trend
- Screen Time manual entry and CSV import
- Four-question eating check-in scored out of 4
- Weekly 0–100 report with tailored suggestions
- JSON backup/restore
- Offline use after first load

## Install on iPhone
A PWA must be served from an HTTPS website (or localhost during development). Upload this folder to any static host such as GitHub Pages, Netlify, Cloudflare Pages, or your own web server.

Then on the iPhone:
1. Open the HTTPS address in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**.
4. Open danielmente from its new icon.
5. In the app, tap **Enable Sunday notification** and allow notifications.

## Important iPhone limitations
- A web app cannot automatically read the Screen Time total shown in iOS Settings. Use the manual fields or import a CSV with columns: `date,hours,minutes`.
- iPhone web notifications require the site to be installed on the Home Screen and permission to be granted.
- This local-only version creates the Sunday report and notification when the app is opened on Sunday. Guaranteed background delivery at a precise time requires a small push-notification server or a native iOS app.

## Data privacy
All health data is stored in the browser's local storage on the device. Use **Export data** periodically to create backups.
