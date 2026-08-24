import { Buffer } from 'buffer';
import { decode as decodeJpeg, encode as encodeJpeg } from 'jpeg-js';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Raster, rasterFromRgba } from './raster';

function cacheDir() {
  const dir = new Directory(Paths.cache, 'scanella');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export async function writeJpegFile(bytes: Uint8Array, name?: string): Promise<string> {
  const file = new File(cacheDir(), name ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  const b64 = Buffer.from(bytes).toString('base64');
  await FileSystem.writeAsStringAsync(file.uri, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return file.uri;
}

export async function deleteQuietly(uri: string | undefined) {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // temp frame; ignore
  }
}

export function encodeRasterJpeg(raster: Raster, quality = 92): Uint8Array {
  const rgba = new Uint8Array(raster.width * raster.height * 4);
  const src = raster.pixels;
  let si = 0;
  let di = 0;
  while (si < src.length) {
    rgba[di++] = src[si++];
    rgba[di++] = src[si++];
    rgba[di++] = src[si++];
    rgba[di++] = 255;
  }
  const encoded = encodeJpeg(
    { data: Buffer.from(rgba), width: raster.width, height: raster.height },
    quality,
  );
  return encoded.data instanceof Uint8Array ? encoded.data : new Uint8Array(encoded.data);
}

function resizeAction(
  maxEdge: number,
  sourceWidth?: number,
  sourceHeight?: number,
): { resize: { width: number } } | { resize: { height: number } } {
  if (sourceWidth && sourceHeight && sourceHeight > sourceWidth) {
    return { resize: { height: maxEdge } };
  }
  return { resize: { width: maxEdge } };
}

/**
 * Always convert through the manipulator (HEIC → JPEG + optional resize) and
 * decode the base64 it returns. Reading the camera's temp file directly fails
 * on iOS Photo/HEIC captures, which made live detection look "stuck".
 */
export async function decodeJpegUri(
  uri: string,
  options?: { maxWidth?: number; maxEdge?: number; sourceWidth?: number; sourceHeight?: number },
): Promise<{ raster: Raster; width: number; height: number; uri: string }> {
  const actions = options?.maxWidth
    ? [{ resize: { width: options.maxWidth } }]
    : options?.maxEdge
      ? [resizeAction(options.maxEdge, options.sourceWidth, options.sourceHeight)]
      : [];

  const result = await manipulateAsync(uri, actions, {
    compress: options?.maxWidth ? 0.7 : 0.92,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Could not read camera image');
  }

  const raw = decodeJpeg(Buffer.from(result.base64, 'base64'), {
    useTArray: true,
    formatAsRGBA: true,
  });
  const raster = rasterFromRgba(raw.width, raw.height, raw.data as Uint8Array);
  return { raster, width: raw.width, height: raw.height, uri: result.uri };
}

/** Longest-edge cap before JS warp/filter. High enough to stay sharp, small enough to finish. */
export const PROCESS_MAX_EDGE = 1600;
