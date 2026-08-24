import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

/**
 * Native document scanner — VisionKit on iOS, ML Kit Document Scanner on
 * Android.
 *
 * This is the same platform CV the Flutter app uses by default, and it is the
 * whole reason this port does not carry its own detector: these are trained
 * models maintained by Apple and Google, and they beat a hand-rolled
 * geometric detector on exactly the awkward frames that matter — a small card
 * on a patterned surface, a page in poor light, a document held at an angle.
 *
 * Pages come back already perspective-corrected and cropped.
 */

export type ScanResult =
  | { status: 'success'; pages: string[] }
  | { status: 'cancelled' };

export async function scanDocument(maxPages = 24): Promise<ScanResult> {
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    // Full quality. This is the number that decides whether a saved page
    // looks like a scan or like a photo of one, and the scanner is the only
    // place in the pipeline that can still get those pixels back.
    croppedImageQuality: 100,
    maxNumDocuments: maxPages,
    responseType: ResponseType.ImageFilePath,
  });

  if (
    status === ScanDocumentResponseStatus.Cancel ||
    !scannedImages ||
    scannedImages.length === 0
  ) {
    return { status: 'cancelled' };
  }

  return { status: 'success', pages: scannedImages };
}
