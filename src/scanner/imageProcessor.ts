/**
 * Port of scan2 `lib/features/crop/domain/image_processor.dart`.
 * Same kernels: white-balance, lighting flatten, luma stretch, adaptive B&W, unsharp.
 */
import { ScanFilter } from '../types';
import { Raster, blurLuma, localMeanLuma } from './raster';

export type ScanAdjustments = {
  filter: ScanFilter;
  brightness: number;
  contrast: number;
};

export function isNoOp(adjustments: ScanAdjustments): boolean {
  return (
    adjustments.filter === 'original' &&
    Math.abs(adjustments.brightness) < 0.001 &&
    Math.abs(adjustments.contrast) < 0.001
  );
}

export function applyAdjustments(src: Raster, adjustments: ScanAdjustments): Raster {
  let out =
    Math.abs(adjustments.brightness) < 0.001 && Math.abs(adjustments.contrast) < 0.001
      ? src.clone()
      : applyTone(src, adjustments.brightness, adjustments.contrast);

  switch (adjustments.filter) {
    case 'original':
      break;
    case 'grayscale':
      out = grayscale(out);
      break;
    case 'bw':
      out = adaptiveBlackAndWhite(out);
      break;
    case 'magic':
      out = autoEnhance(out);
      break;
    case 'enhance':
      out = sharpen(out, 1.1);
      break;
  }
  return out;
}

function applyTone(src: Raster, brightness: number, contrast: number): Raster {
  const lut = new Uint8Array(256);
  const c = 1 + contrast * 0.85;
  const b = brightness * 90;
  for (let i = 0; i < 256; i += 1) {
    lut[i] = clampByte(Math.round((i - 128) * c + 128 + b));
  }
  const out = new Raster(src.width, src.height);
  for (let i = 0; i < src.pixels.length; i += 1) {
    out.pixels[i] = lut[src.pixels[i]];
  }
  return out;
}

function grayscale(src: Raster): Raster {
  const luma = src.toLuma();
  const out = new Raster(src.width, src.height);
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    const v = luma[p];
    out.pixels[i++] = v;
    out.pixels[i++] = v;
    out.pixels[i++] = v;
  }
  return out;
}

function relativeRadius(src: Raster, fraction: number, min: number, max: number): number {
  const base = Math.min(src.width, src.height) * fraction;
  return Math.min(max, Math.max(min, Math.round(base)));
}

function sharpen(src: Raster, amount: number): Raster {
  const luma = src.toLuma();
  const radius = relativeRadius(src, 0.004, 1, 24);
  const blurred = blurLuma(luma, src.width, src.height, radius);
  const amountQ8 = Math.round(amount * 256);
  const out = new Raster(src.width, src.height);
  const dst = out.pixels;
  const srcPixels = src.pixels;
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    const delta = ((luma[p] - blurred[p]) * amountQ8) >> 8;
    dst[i] = clampByte(srcPixels[i] + delta);
    dst[i + 1] = clampByte(srcPixels[i + 1] + delta);
    dst[i + 2] = clampByte(srcPixels[i + 2] + delta);
    i += 3;
  }
  return out;
}

function adaptiveBlackAndWhite(src: Raster): Raster {
  const luma = src.toLuma();
  const radius = relativeRadius(src, 0.045, 4, 160);
  const localMean = localMeanLuma(luma, src.width, src.height, radius);
  const out = new Raster(src.width, src.height);
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    const v = luma[p] < localMean[p] * 0.9 ? 0 : 255;
    out.pixels[i++] = v;
    out.pixels[i++] = v;
    out.pixels[i++] = v;
  }
  return out;
}

function autoEnhance(src: Raster): Raster {
  const balanced = whiteBalancePaper(src);
  const flattened = flattenLighting(balanced, 242, 563, 0.08);
  const contrasted = stretchLuma(flattened, 0.008, 0.995, 18, 246);
  return sharpen(contrasted, 0.35);
}

function flattenLighting(
  src: Raster,
  targetPaper: number,
  maxGainQ8: number,
  radiusFraction: number,
): Raster {
  const luma = src.toLuma();
  const radius = relativeRadius(src, radiusFraction, 8, 220);
  const background = localMeanLuma(luma, src.width, src.height, radius);
  const gainQ8 = new Int32Array(256);
  for (let v = 0; v < 256; v += 1) {
    const g = Math.floor((targetPaper * 256) / Math.max(v, 8));
    gainQ8[v] = Math.min(maxGainQ8, Math.max(200, g));
  }
  const out = new Raster(src.width, src.height);
  const dst = out.pixels;
  const srcPixels = src.pixels;
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    const gain = gainQ8[background[p]];
    dst[i] = Math.min(255, (srcPixels[i] * gain) >> 8);
    dst[i + 1] = Math.min(255, (srcPixels[i + 1] * gain) >> 8);
    dst[i + 2] = Math.min(255, (srcPixels[i + 2] * gain) >> 8);
    i += 3;
  }
  return out;
}

function whiteBalancePaper(src: Raster, strength = 1): Raster {
  const luma = src.toLuma();
  const histogram = new Int32Array(256);
  for (let i = 0; i < luma.length; i += 1) histogram[luma[i]] += 1;
  const cutoff = histogramPercentile(histogram, luma.length, 0.7);

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let n = 0;
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    if (luma[p] >= cutoff) {
      sumR += src.pixels[i];
      sumG += src.pixels[i + 1];
      sumB += src.pixels[i + 2];
      n += 1;
    }
    i += 3;
  }
  if (n < 16) return src;

  const meanR = sumR / n;
  const meanG = sumG / n;
  const meanB = sumB / n;
  const paper = Math.max(meanR, meanG, meanB);
  if (paper < 8) return src;

  let sR = 1 + (paper / Math.max(meanR, 1) - 1) * strength;
  let sG = 1 + (paper / Math.max(meanG, 1) - 1) * strength;
  let sB = 1 + (paper / Math.max(meanB, 1) - 1) * strength;
  sR = clamp(sR, 0.72, 1.55);
  sG = clamp(sG, 0.72, 1.55);
  sB = clamp(sB, 0.72, 1.55);
  const lift = clamp(244 / paper, 1, 1.12);
  sR *= lift;
  sG *= lift;
  sB *= lift;

  const out = new Raster(src.width, src.height);
  i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    out.pixels[i] = clampByte(Math.round(src.pixels[i] * sR));
    out.pixels[i + 1] = clampByte(Math.round(src.pixels[i + 1] * sG));
    out.pixels[i + 2] = clampByte(Math.round(src.pixels[i + 2] * sB));
    i += 3;
  }
  return out;
}

function stretchLuma(
  src: Raster,
  lowPct: number,
  highPct: number,
  mapLow: number,
  mapHigh: number,
): Raster {
  const luma = src.toLuma();
  const histogram = new Int32Array(256);
  for (let i = 0; i < luma.length; i += 1) histogram[luma[i]] += 1;
  const low = histogramPercentile(histogram, luma.length, lowPct);
  const high = histogramPercentile(histogram, luma.length, highPct);
  if (high - low < 24) return src;

  const lut = new Uint8Array(256);
  const span = high - low;
  const mapped = mapHigh - mapLow;
  for (let v = 0; v < 256; v += 1) {
    lut[v] = clampByte(Math.round(mapLow + ((v - low) / span) * mapped));
  }

  const out = new Raster(src.width, src.height);
  let i = 0;
  for (let p = 0; p < luma.length; p += 1) {
    const delta = lut[luma[p]] - luma[p];
    out.pixels[i] = clampByte(src.pixels[i] + delta);
    out.pixels[i + 1] = clampByte(src.pixels[i + 1] + delta);
    out.pixels[i + 2] = clampByte(src.pixels[i + 2] + delta);
    i += 3;
  }
  return out;
}

function histogramPercentile(histogram: Int32Array, total: number, pct: number): number {
  const target = Math.min(total, Math.max(1, Math.round(total * pct)));
  let running = 0;
  for (let v = 0; v < 256; v += 1) {
    running += histogram[v];
    if (running >= target) return v;
  }
  return 255;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clampByte(v: number): number {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v;
}
