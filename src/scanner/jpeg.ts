import { Buffer } from 'buffer';
import { decode as decodeJpeg, encode as encodeJpeg } from 'jpeg-js';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import { ActionCrop, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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

function rasterFromBase64(b64: string): { raster: Raster; width: number; height: number } {
  const raw = decodeJpeg(Buffer.from(b64, 'base64'), { useTArray: true, formatAsRGBA: true });
  return {
    raster: rasterFromRgba(raw.width, raw.height, raw.data as Uint8Array),
    width: raw.width,
    height: raw.height,
  };
}

export type JpegImage = {
  uri: string;
  width: number;
  height: number;
  base64?: string;
};

/** Convert HEIC/camera output to a full-quality JPEG without shrinking it. */
export async function toFullJpeg(uri: string): Promise<JpegImage> {
  const result = await manipulateAsync(uri, [], { compress: 1, format: SaveFormat.JPEG });
  return { uri: result.uri, width: result.width, height: result.height };
}

export async function cropJpeg(uri: string, crop: ActionCrop['crop']): Promise<JpegImage> {
  const result = await manipulateAsync(uri, [{ crop }], {
    compress: 1,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('Could not crop page');
  return { uri: result.uri, width: result.width, height: result.height, base64: result.base64 };
}

export async function resizeJpeg(image: JpegImage, maxEdge: number): Promise<JpegImage> {
  if (Math.max(image.width, image.height) <= maxEdge) return image;
  const result = await manipulateAsync(
    image.uri,
    [resizeAction(maxEdge, image.width, image.height)],
    {
      compress: 1,
      format: SaveFormat.JPEG,
      base64: true,
    },
  );
  if (!result.base64) throw new Error('Could not resize page');
  return { uri: result.uri, width: result.width, height: result.height, base64: result.base64 };
}

export function decodeBase64Jpeg(b64: string): { raster: Raster; width: number; height: number } {
  return rasterFromBase64(b64);
}

/**
 * Always convert through the manipulator (HEIC → JPEG + optional resize).
 * Live analysis uses maxWidth 240; capture uses a high maxEdge and compress 1.
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
    compress: options?.maxWidth ? 0.7 : 1,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Could not read camera image');
  }

  const decoded = rasterFromBase64(result.base64);
  return { ...decoded, uri: result.uri };
}

/** Longest-edge cap after native page crop — scan2 warps up to 12MP; 2400 keeps text sharp in Expo Go. */
export const PROCESS_MAX_EDGE = 2400;
