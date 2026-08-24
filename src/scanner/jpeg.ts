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

export async function readFileBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function writeJpegFile(bytes: Uint8Array, name?: string): Promise<string> {
  const file = new File(cacheDir(), name ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  const b64 = Buffer.from(bytes).toString('base64');
  await FileSystem.writeAsStringAsync(file.uri, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return file.uri;
}

export async function writeJpegToUri(uri: string, bytes: Uint8Array): Promise<void> {
  const b64 = Buffer.from(bytes).toString('base64');
  await FileSystem.writeAsStringAsync(uri, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
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

export async function decodeJpegUri(
  uri: string,
  options?: { maxWidth?: number; maxEdge?: number; sourceWidth?: number; sourceHeight?: number },
): Promise<{ raster: Raster; width: number; height: number; uri: string }> {
  let source = uri;
  if (options?.maxWidth) {
    const resized = await manipulateAsync(uri, [{ resize: { width: options.maxWidth } }], {
      compress: 0.72,
      format: SaveFormat.JPEG,
    });
    source = resized.uri;
  } else if (options?.maxEdge) {
    const resized = await manipulateAsync(
      uri,
      [resizeAction(options.maxEdge, options.sourceWidth, options.sourceHeight)],
      {
        compress: 0.85,
        format: SaveFormat.JPEG,
      },
    );
    source = resized.uri;
  }

  const b64 = await readFileBase64(source);
  const bytes = Buffer.from(b64, 'base64');
  const raw = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });
  const raster = rasterFromRgba(raw.width, raw.height, raw.data as Uint8Array);
  return { raster, width: raw.width, height: raw.height, uri: source };
}

/** Longest-edge cap used before JS warp/filter so Expo Go stays responsive. */
export const PROCESS_MAX_EDGE = 1600;
