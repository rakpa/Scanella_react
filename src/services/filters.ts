import { ScanFilter } from '../types';
import { renderPage } from '../scanner/scanPipeline';

export async function applyFilterToUri(
  uri: string,
  filter: ScanFilter,
  brightness = 0,
  contrast = 0,
) {
  return renderPage({ originalUri: uri, filter, brightness, contrast });
}
