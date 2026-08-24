/**
 * Tightly packed 8-bit RGB raster — same layout as scan2 lib/core/imaging/raster.dart.
 */

export class Raster {
  readonly pixels: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    pixels?: Uint8Array,
  ) {
    this.pixels = pixels ?? new Uint8Array(width * height * 3);
  }

  get length(): number {
    return this.width * this.height;
  }

  clone(): Raster {
    return new Raster(this.width, this.height, new Uint8Array(this.pixels));
  }

  /** Rec. 601 luma. */
  toLuma(): Uint8Array {
    const out = new Uint8Array(this.length);
    const px = this.pixels;
    let i = 0;
    for (let p = 0; p < out.length; p += 1) {
      out[p] = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;
      i += 3;
    }
    return out;
  }

  downscaledTo(maxEdge: number): Raster {
    const longest = Math.max(this.width, this.height);
    if (longest <= maxEdge) return this;

    const scale = maxEdge / longest;
    const dw = Math.max(1, Math.round(this.width * scale));
    const dh = Math.max(1, Math.round(this.height * scale));
    const out = new Raster(dw, dh);
    const { width, height, pixels } = this;

    for (let y = 0; y < dh; y += 1) {
      const sy0 = Math.floor((y * height) / dh);
      const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * height) / dh));
      for (let x = 0; x < dw; x += 1) {
        const sx0 = Math.floor((x * width) / dw);
        const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * width) / dw));
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let sy = sy0; sy < sy1 && sy < height; sy += 1) {
          let i = (sy * width + sx0) * 3;
          for (let sx = sx0; sx < sx1 && sx < width; sx += 1) {
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            i += 3;
            n += 1;
          }
        }
        if (n === 0) n = 1;
        const o = (y * dw + x) * 3;
        out.pixels[o] = Math.floor(r / n);
        out.pixels[o + 1] = Math.floor(g / n);
        out.pixels[o + 2] = Math.floor(b / n);
      }
    }
    return out;
  }
}

export function rasterFromRgba(width: number, height: number, rgba: Uint8Array): Raster {
  const out = new Raster(width, height);
  const dst = out.pixels;
  let o = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    dst[o++] = rgba[i];
    dst[o++] = rgba[i + 1];
    dst[o++] = rgba[i + 2];
  }
  return out;
}

export function lumaFromRgba(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const lum = new Uint8Array(width * height);
  let p = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    lum[p++] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return lum;
}

/** Separable box blur repeated three times (Gaussian-ish, O(pixels)). */
export function blurLuma(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius < 1) return new Uint8Array(src);
  let buffer = new Uint8Array(src);
  const scratch = new Uint8Array(src.length);
  for (let pass = 0; pass < 3; pass += 1) {
    boxBlurH(buffer, scratch, width, height, radius);
    boxBlurV(scratch, buffer, width, height, radius);
  }
  return buffer;
}

function boxBlurH(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const window = 2 * r + 1;
  const last = w - 1;
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    const first = src[row];
    const edge = src[row + last];
    let sum = first * (r + 1);
    for (let i = 1; i <= r; i += 1) {
      sum += src[row + (i <= last ? i : last)];
    }
    let x = 0;
    const headEnd = Math.min(r + 1, w);
    for (; x < headEnd; x += 1) {
      dst[row + x] = Math.floor(sum / window);
      sum += src[row + (x + r + 1 <= last ? x + r + 1 : last)] - first;
    }
    const midEnd = Math.min(w - r - 1, w);
    for (; x < midEnd; x += 1) {
      dst[row + x] = Math.floor(sum / window);
      sum += src[row + x + r + 1] - src[row + x - r];
    }
    for (; x < w; x += 1) {
      dst[row + x] = Math.floor(sum / window);
      sum += edge - src[row + (x - r >= 0 ? x - r : 0)];
    }
  }
}

function boxBlurV(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const window = 2 * r + 1;
  const last = h - 1;
  for (let x = 0; x < w; x += 1) {
    const first = src[x];
    const edge = src[last * w + x];
    let sum = first * (r + 1);
    for (let i = 1; i <= r; i += 1) {
      sum += src[(i <= last ? i : last) * w + x];
    }
    let y = 0;
    const headEnd = Math.min(r + 1, h);
    for (; y < headEnd; y += 1) {
      dst[y * w + x] = Math.floor(sum / window);
      sum += src[(y + r + 1 <= last ? y + r + 1 : last) * w + x] - first;
    }
    const midEnd = Math.min(h - r - 1, h);
    for (; y < midEnd; y += 1) {
      dst[y * w + x] = Math.floor(sum / window);
      sum += src[(y + r + 1) * w + x] - src[(y - r) * w + x];
    }
    for (; y < h; y += 1) {
      dst[y * w + x] = Math.floor(sum / window);
      sum += edge - src[(y - r >= 0 ? y - r : 0) * w + x];
    }
  }
}

export function localMeanLuma(
  src: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  if (radius < 1) return new Uint8Array(src);

  const targetRadius = 6;
  let factor = Math.floor(radius / targetRadius);
  if (factor < 2) return blurLuma(src, width, height, radius);

  const sw = Math.max(8, Math.floor(width / factor));
  const sh = Math.max(8, Math.floor(height / factor));
  factor = Math.max(1, Math.min(Math.floor(width / sw), Math.floor(height / sh)));

  const small = downsampleLuma(src, width, height, sw, sh);
  const smallRadius = Math.max(1, Math.floor(radius / factor));
  const blurred = blurLuma(small, sw, sh, smallRadius);
  return upsampleLuma(blurred, sw, sh, width, height);
}

function downsampleLuma(src: Uint8Array, w: number, h: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y += 1) {
    const sy0 = Math.floor((y * h) / dh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * h) / dh));
    for (let x = 0; x < dw; x += 1) {
      const sx0 = Math.floor((x * w) / dw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * w) / dw));
      let sum = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1 && sy < h; sy += 1) {
        const row = sy * w;
        for (let sx = sx0; sx < sx1 && sx < w; sx += 1) {
          sum += src[row + sx];
          n += 1;
        }
      }
      out[y * dw + x] = n === 0 ? src[0] : Math.floor(sum / n);
    }
  }
  return out;
}

function upsampleLuma(src: Uint8Array, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const out = new Uint8Array(dw * dh);
  const xScale = sw / dw;
  const yScale = sh / dh;
  for (let y = 0; y < dh; y += 1) {
    const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) * yScale - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, sh - 1);
    const ty = fy - y0;
    const row0 = y0 * sw;
    const row1 = y1 * sw;
    const dstRow = y * dw;
    for (let x = 0; x < dw; x += 1) {
      const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) * xScale - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, sw - 1);
      const tx = fx - x0;
      const top = src[row0 + x0] * (1 - tx) + src[row0 + x1] * tx;
      const bottom = src[row1 + x0] * (1 - tx) + src[row1 + x1] * tx;
      out[dstRow + x] = Math.round(top * (1 - ty) + bottom * ty);
      if (out[dstRow + x] > 255) out[dstRow + x] = 255;
    }
  }
  return out;
}
