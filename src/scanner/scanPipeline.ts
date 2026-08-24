/**
 * Capture pipeline matching scan2 PageProcessor:
 * detect on a 320px luma copy, perspective-correct the full page, enhance.
 */
import { ScanFilter } from '../types';
import { Quad, quadBoundingBox, remapQuadToCrop } from './geometry';
import {
  ANALYSIS_WIDTH,
  STILL_ANALYSIS_EDGE,
  detectFromLuminance,
  detectionToQuad,
} from './documentQuadDetector';
import { applyAdjustments, isNoOp, ScanAdjustments } from './imageProcessor';
import {
  cropJpeg,
  decodeBase64Jpeg,
  decodeJpegUri,
  encodeRasterJpeg,
  PROCESS_MAX_EDGE,
  resizeJpeg,
  toFullJpeg,
  writeJpegFile,
} from './jpeg';
import { warpRaster } from './perspective';
import { Raster } from './raster';

export type LiveDetection = {
  quad: Quad | null;
  confidence: number;
  width: number;
  height: number;
};

export async function detectLiveFromUri(uri: string): Promise<LiveDetection> {
  const decoded = await decodeJpegUri(uri, { maxWidth: ANALYSIS_WIDTH });
  const lum = decoded.raster.toLuma();
  const detection = detectFromLuminance(lum, decoded.width, decoded.height);
  if (!detection) {
    return { quad: null, confidence: 0, width: decoded.width, height: decoded.height };
  }
  return {
    quad: Quad.fromCorners(detection.corners),
    confidence: detection.confidence,
    width: decoded.width,
    height: decoded.height,
  };
}

export function detectQuadInRaster(source: Raster): Quad | null {
  const small = source.downscaledTo(STILL_ANALYSIS_EDGE);
  const detection = detectFromLuminance(small.toLuma(), small.width, small.height);
  if (!detection) return null;
  return detectionToQuad(detection, 0.006);
}

export type ProcessedPage = {
  processedUri: string;
  originalUri: string;
  quad: Quad | null;
};

export async function processCapture(options: {
  uri: string;
  fallbackQuad?: Quad | null;
  filter: ScanFilter;
  brightness?: number;
  contrast?: number;
  detectEdges?: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
}): Promise<ProcessedPage> {
  // Full-quality JPEG, same as scan2 decoding the still at native resolution.
  const full = await toFullJpeg(options.uri);

  let quad: Quad | null = null;
  if (options.detectEdges !== false) {
    const analysis = await decodeJpegUri(full.uri, {
      maxEdge: STILL_ANALYSIS_EDGE,
      sourceWidth: full.width,
      sourceHeight: full.height,
    });
    const detection = detectFromLuminance(analysis.raster.toLuma(), analysis.width, analysis.height);
    quad = detection ? detectionToQuad(detection, 0.006) : options.fallbackQuad ?? null;
  }

  let page = full;
  let localQuad = quad;
  if (quad) {
    try {
      const box = quadBoundingBox(quad, full.width, full.height);
      page = await cropJpeg(full.uri, box);
      localQuad = remapQuadToCrop(quad, box, full.width, full.height);
    } catch {
      localQuad = quad;
    }
  }

  page = await resizeJpeg(page, PROCESS_MAX_EDGE);
  const decoded = page.base64
    ? decodeBase64Jpeg(page.base64)
    : await decodeJpegUri(page.uri, {
        maxEdge: PROCESS_MAX_EDGE,
        sourceWidth: page.width,
        sourceHeight: page.height,
      });

  const warped = localQuad ? (warpRaster(decoded.raster, localQuad) ?? decoded.raster) : decoded.raster;

  const originalBytes = encodeRasterJpeg(warped, 92);
  const originalUri = await writeJpegFile(originalBytes, `orig-${Date.now()}.jpg`);

  const adjustments: ScanAdjustments = {
    filter: options.filter,
    brightness: options.brightness ?? 0,
    contrast: options.contrast ?? 0,
  };

  if (isNoOp(adjustments)) {
    return { processedUri: originalUri, originalUri, quad };
  }

  const filtered = applyAdjustments(warped, adjustments);
  const processedUri = await writeJpegFile(encodeRasterJpeg(filtered, 92), `page-${Date.now()}.jpg`);
  return { processedUri, originalUri, quad };
}

export async function renderPage(options: {
  originalUri: string;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
  previewMaxEdge?: number;
}): Promise<string> {
  const decoded = await decodeJpegUri(options.originalUri, {
    maxEdge: options.previewMaxEdge,
  });
  let raster = decoded.raster;
  if (options.previewMaxEdge && Math.max(raster.width, raster.height) > options.previewMaxEdge) {
    raster = raster.downscaledTo(options.previewMaxEdge);
  }
  const adjustments: ScanAdjustments = {
    filter: options.filter,
    brightness: options.brightness,
    contrast: options.contrast,
  };
  if (isNoOp(adjustments)) return options.originalUri;
  const filtered = applyAdjustments(raster, adjustments);
  return writeJpegFile(encodeRasterJpeg(filtered, 90), `preview-${Date.now()}.jpg`);
}

export async function renderPageBytes(options: {
  originalUri: string;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
}): Promise<{ uri: string; bytes: Uint8Array }> {
  const decoded = await decodeJpegUri(options.originalUri, { maxEdge: PROCESS_MAX_EDGE });
  let raster = decoded.raster;
  if (Math.max(raster.width, raster.height) > PROCESS_MAX_EDGE) {
    raster = raster.downscaledTo(PROCESS_MAX_EDGE);
  }
  const adjustments: ScanAdjustments = {
    filter: options.filter,
    brightness: options.brightness,
    contrast: options.contrast,
  };
  const out = isNoOp(adjustments) ? raster : applyAdjustments(raster, adjustments);
  const bytes = encodeRasterJpeg(out, 92);
  const uri = await writeJpegFile(bytes, `save-${Date.now()}.jpg`);
  return { uri, bytes };
}
