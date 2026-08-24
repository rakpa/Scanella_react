/**
 * Port of scan2 `lib/features/crop/domain/perspective_transformer.dart`.
 * Heckbert square-to-quad homography + bilinear sampling.
 */
import { Point, Quad, isFullFrame } from './geometry';
import { Raster } from './raster';

const MAX_WARP_PIXELS = 12 * 1000 * 1000;

export class Homography {
  constructor(
    readonly a11: number,
    readonly a21: number,
    readonly a31: number,
    readonly a12: number,
    readonly a22: number,
    readonly a32: number,
    readonly a13: number,
    readonly a23: number,
  ) {}

  static unitSquareTo(tl: Point, tr: Point, br: Point, bl: Point): Homography {
    const sumX = tl.x - tr.x + br.x - bl.x;
    const sumY = tl.y - tr.y + br.y - bl.y;

    if (Math.abs(sumX) < 1e-9 && Math.abs(sumY) < 1e-9) {
      return new Homography(
        tr.x - tl.x,
        br.x - tr.x,
        tl.x,
        tr.y - tl.y,
        br.y - tr.y,
        tl.y,
        0,
        0,
      );
    }

    const dx1 = tr.x - br.x;
    const dx2 = bl.x - br.x;
    const dy1 = tr.y - br.y;
    const dy2 = bl.y - br.y;
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-12) {
      return new Homography(
        tr.x - tl.x,
        br.x - tr.x,
        tl.x,
        tr.y - tl.y,
        br.y - tr.y,
        tl.y,
        0,
        0,
      );
    }

    const a13 = (sumX * dy2 - dx2 * sumY) / den;
    const a23 = (dx1 * sumY - sumX * dy1) / den;
    return new Homography(
      tr.x - tl.x + a13 * tr.x,
      bl.x - tl.x + a23 * bl.x,
      tl.x,
      tr.y - tl.y + a13 * tr.y,
      bl.y - tl.y + a23 * bl.y,
      tl.y,
      a13,
      a23,
    );
  }

  map(u: number, v: number): Point {
    const w = this.a13 * u + this.a23 * v + 1;
    if (Math.abs(w) < 1e-12) return { x: 0, y: 0 };
    return {
      x: (this.a11 * u + this.a21 * v + this.a31) / w,
      y: (this.a12 * u + this.a22 * v + this.a32) / w,
    };
  }
}

export function warpRaster(src: Raster, quad: Quad): Raster | null {
  if (isFullFrame(quad)) return src;

  const w = src.width;
  const h = src.height;
  const tl = { x: quad.topLeft.x * w, y: quad.topLeft.y * h };
  const tr = { x: quad.topRight.x * w, y: quad.topRight.y * h };
  const br = { x: quad.bottomRight.x * w, y: quad.bottomRight.y * h };
  const bl = { x: quad.bottomLeft.x * w, y: quad.bottomLeft.y * h };

  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  let targetW = Math.round(Math.max(dist(tr, tl), dist(br, bl)));
  let targetH = Math.round(Math.max(dist(bl, tl), dist(br, tr)));
  if (targetW < 8 || targetH < 8) return null;

  const pixels = targetW * targetH;
  if (pixels > MAX_WARP_PIXELS) {
    const scale = Math.sqrt(MAX_WARP_PIXELS / pixels);
    targetW = Math.max(8, Math.round(targetW * scale));
    targetH = Math.max(8, Math.round(targetH * scale));
  }

  const homography = Homography.unitSquareTo(tl, tr, br, bl);
  const dst = new Raster(targetW, targetH);
  const maxX = src.width - 1;
  const maxY = src.height - 1;
  let o = 0;
  for (let y = 0; y < targetH; y += 1) {
    const v = targetH === 1 ? 0 : y / (targetH - 1);
    for (let x = 0; x < targetW; x += 1) {
      const u = targetW === 1 ? 0 : x / (targetW - 1);
      const p = homography.map(u, v);
      const fx = Math.min(maxX, Math.max(0, p.x));
      const fy = Math.min(maxY, Math.max(0, p.y));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, maxX);
      const y1 = Math.min(y0 + 1, maxY);
      const tx = fx - x0;
      const ty = fy - y0;
      const i00 = (y0 * src.width + x0) * 3;
      const i10 = (y0 * src.width + x1) * 3;
      const i01 = (y1 * src.width + x0) * 3;
      const i11 = (y1 * src.width + x1) * 3;
      for (let c = 0; c < 3; c += 1) {
        const top = src.pixels[i00 + c] * (1 - tx) + src.pixels[i10 + c] * tx;
        const bottom = src.pixels[i01 + c] * (1 - tx) + src.pixels[i11 + c] * tx;
        const value = Math.round(top * (1 - ty) + bottom * ty);
        dst.pixels[o + c] = value < 0 ? 0 : value > 255 ? 255 : value;
      }
      o += 3;
    }
  }
  return dst;
}
