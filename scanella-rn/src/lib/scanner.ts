import * as ImagePicker from 'expo-image-picker';

/**
 * Document capture, with two backends.
 *
 * **Native** (`react-native-document-scanner-plugin`): VisionKit on iOS, the
 * ML Kit Document Scanner on Android. This is the same platform CV the Flutter
 * app uses by default — trained models maintained by Apple and Google that
 * beat a hand-rolled geometric detector on the frames that actually matter: a
 * small card on a patterned surface, a page in poor light, a page held at an
 * angle. Pages come back already perspective-corrected and cropped.
 *
 * **Fallback** (`expo-image-picker`): a plain camera. No edge detection, no
 * auto-capture, no cropping beyond what the user does by hand.
 *
 * The fallback exists because the native scanner is a native module, and Expo
 * Go ships a fixed set of those — it cannot load this one. Rather than crash
 * on a missing TurboModule, the app runs with the camera so the library,
 * export and theming are all testable in Expo Go, and picks up real edge
 * detection automatically in a development build.
 */

export type ScanBackend = 'native' | 'camera';

export type ScanResult =
  | { status: 'success'; pages: string[]; backend: ScanBackend }
  | { status: 'cancelled' };

type ScannerModule = {
  default: {
    scanDocument(options: {
      croppedImageQuality?: number;
      maxNumDocuments?: number;
      responseType?: string;
    }): Promise<{ scannedImages?: string[]; status?: string }>;
  };
  ResponseType: { ImageFilePath: string };
  ScanDocumentResponseStatus: { Cancel: string };
};

/**
 * Resolved once, lazily.
 *
 * The plugin's entry point ends in `TurboModuleRegistry.getEnforcing`, which
 * throws while the module is being imported rather than when it is first
 * called. A top-level `import` would therefore take the whole app down on
 * startup under Expo Go, before any of this could be caught — hence `require`
 * inside a try, behind a cache.
 */
let cached: ScannerModule | null | undefined;

function nativeScanner(): ScannerModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-document-scanner-plugin') as ScannerModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Whether real edge detection is available in this build. */
export function isNativeScannerAvailable(): boolean {
  return nativeScanner() !== null;
}

export function activeBackend(): ScanBackend {
  return isNativeScannerAvailable() ? 'native' : 'camera';
}

export async function scanDocument(maxPages = 24): Promise<ScanResult> {
  const native = nativeScanner();
  return native ? scanNative(native, maxPages) : scanWithCamera();
}

async function scanNative(
  module: ScannerModule,
  maxPages: number
): Promise<ScanResult> {
  const { scannedImages, status } = await module.default.scanDocument({
    // Full quality. The scanner is the last point in the pipeline that still
    // holds these pixels; anything lost here cannot be recovered later.
    croppedImageQuality: 100,
    maxNumDocuments: maxPages,
    responseType: module.ResponseType.ImageFilePath,
  });

  if (
    status === module.ScanDocumentResponseStatus.Cancel ||
    !scannedImages ||
    scannedImages.length === 0
  ) {
    return { status: 'cancelled' };
  }

  return { status: 'success', pages: scannedImages, backend: 'native' };
}

async function scanWithCamera(): Promise<ScanResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Camera access is needed to scan. Enable it for this app in Settings.'
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    // The user frames the page themselves here, so let them trim it. This is
    // a rectangular hand crop, not the perspective correction the native
    // scanner applies.
    allowsEditing: true,
    quality: 1,
    exif: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return { status: 'cancelled' };
  }

  return {
    status: 'success',
    pages: result.assets.map((a) => a.uri),
    backend: 'camera',
  };
}
