# Scanella (React Native)

A React Native port of the Scanella document scanner, built with Expo (SDK 57,
RN 0.86, New Architecture).

The Flutter app in the repository root is unchanged and still builds; this
lives alongside it rather than replacing it.

## Why this port has no edge detector of its own

The Flutter app ships two capture paths: its own Dart geometric detector with
a live overlay, and — the default — the platform's document scanner. This port
carries only the second, deliberately.

`react-native-document-scanner-plugin` wraps **VisionKit** on iOS and the
**ML Kit Document Scanner** on Android: the same trained models the Flutter
app already calls by default. They beat a hand-rolled detector on exactly the
frames that matter — a small card on a patterned surface, a page in poor
light, a document held at an angle — and pages come back already
perspective-corrected and cropped.

So the scan quality here should match the Flutter app's default path. What a
port buys is UI freedom, not better detection.

## Running it

The scanner is a native module, so **this will not run in Expo Go** — it needs
a development build.

```bash
cd scanella-rn
npm install

# Generate the native projects and run
npx expo run:android      # or: npx expo run:ios  (macOS only)
```

`npx expo prebuild` regenerates `android/` and `ios/`; both are gitignored, so
the config in `app.json` is the source of truth. The camera permission string
is applied by the scanner's Expo config plugin.

`npm start` alone only serves JS — it still needs the dev build installed.

## Layout

```
app/                    expo-router routes
  _layout.tsx           root stack, themed for light and dark
  index.tsx             library — the document list and the scan button
  document/[id].tsx     one document: its pages, PDF export, delete
src/
  theme/brand.ts        design tokens ported from lib/core/theme/brand.dart
  lib/scanner.ts        native scanner wrapper (VisionKit / ML Kit)
  lib/store.ts          SQLite library + page files on disk
  lib/export.ts         PDF build and share sheet
  components/           wordmark, primary button, card, palette hook
```

## State of the port

Working: scanning, multi-page documents, a persistent library, page viewing,
PDF export and share, delete, light and dark themes.

Not yet carried over from the Flutter app: the crop/corner editor, the scan
filters (magic/greyscale/black-and-white), OCR, the batch strip, onboarding
and the account screens, and document rename in the UI (`renameDocument` is in
the store but not yet wired to a control).

## Verification

`npx tsc --noEmit` passes under `strict`, and `npx expo export` bundles for
Android. Neither is a substitute for running it on a device — the scanner
itself cannot be exercised without one.
