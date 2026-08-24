# Scanella

An offline document scanner for iPhone, built with React Native (Expo).

Point the camera at a page. Scanella hands capture to the iOS document scanner (VisionKit), then keeps every page on this device — titles, filters, PDFs and all. Nothing is uploaded.

Light is the default look. Dark is available under Settings → Appearance.

## What shipped

- Welcome, 3-step onboarding, optional login / create account
- Document library with import from files or Photos
- Native iOS scan (VisionKit) plus an in-app camera option
- Page enhance (Auto / Grayscale / B&W / Sharp) with brightness and contrast
- Export to PDF, Photos, or the share sheet
- On-device storage only

Primary actions use the lime pill button (`#BEF264`) with navy label, matching the Scanella mock.

## Run on iOS

```bash
npm install
npx expo start --ios
```

A development build is required for the VisionKit scanner, camera, and Photos export. Expo Go will still run the UI; capture falls back to the system camera picker when the native scanner module is unavailable.

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

Bundle id: `com.scanella.app`

## Theme

Default: **light**. Settings lets you pick Light, Dark, or System.

## Layout

```
App.tsx                 fonts, splash, providers
src/
  theme/                lime + navy tokens, light/dark palettes
  components/           pill button, fields, wordmark, capsule dots
  screens/              welcome → library → scan → enhance → export
  services/             VisionKit scan, files, PDF export
  store/                onboarding, settings, documents (AsyncStorage)
```
