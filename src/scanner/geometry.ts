/** Four-corner document boundary in normalized 0–1 image coordinates. */
export type Point = { x: number; y: number };

export function point(x: number, y: number): Point {
  return { x, y };
}

export function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export class Quad {
  constructor(
    public readonly topLeft: Point,
    public readonly topRight: Point,
    public readonly bottomRight: Point,
    public readonly bottomLeft: Point,
  ) {}

  static centered(): Quad {
    return new Quad(
      { x: 0.12, y: 0.18 },
      { x: 0.88, y: 0.18 },
      { x: 0.88, y: 0.82 },
      { x: 0.12, y: 0.82 },
    );
  }

  static fullFrame(): Quad {
    return new Quad(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    );
  }

  static fromCorners(corners: Point[]): Quad {
    const ordered = orderCorners(corners);
    return new Quad(ordered[0], ordered[1], ordered[2], ordered[3]);
  }

  get corners(): Point[] {
    return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
  }

  /** Pull every corner toward the centre so the crop sits inside the paper edge. */
  shrink(fraction: number): Quad {
    if (fraction <= 0) return this;
    const centre = {
      x: (this.topLeft.x + this.topRight.x + this.bottomRight.x + this.bottomLeft.x) / 4,
      y: (this.topLeft.y + this.topRight.y + this.bottomRight.y + this.bottomLeft.y) / 4,
    };
    const pull = (corner: Point) => lerpPoint(corner, centre, fraction);
    return new Quad(
      pull(this.topLeft),
      pull(this.topRight),
      pull(this.bottomRight),
      pull(this.bottomLeft),
    );
  }

  get areaRatio(): number {
    const pts = this.corners;
    let area = 0;
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area += a.x * b.y - b.x * a.y;
    }
    return Math.abs(area) / 2;
  }

  lerp(other: Quad, t: number): Quad {
    return new Quad(
      lerpPoint(this.topLeft, other.topLeft, t),
      lerpPoint(this.topRight, other.topRight, t),
      lerpPoint(this.bottomRight, other.bottomRight, t),
      lerpPoint(this.bottomLeft, other.bottomLeft, t),
    );
  }

  averageCornerDistance(other: Quad): number {
    const a = this.corners;
    const b = other.corners;
    let sum = 0;
    for (let i = 0; i < 4; i += 1) sum += dist(a[i], b[i]);
    return sum / 4;
  }
}

/** Orders 4 points as TL, TR, BR, BL using the sum/diff heuristic. */
export function orderCorners(pts: Point[]): Point[] {
  const pick = (score: (p: Point) => number, minimum: boolean) => {
    let best = pts[0];
    for (let i = 1; i < pts.length; i += 1) {
      const p = pts[i];
      const better = minimum ? score(p) < score(best) : score(p) > score(best);
      if (better) best = p;
    }
    return best;
  };
  const tl = pick((p) => p.x + p.y, true);
  const br = pick((p) => p.x + p.y, false);
  const tr = pick((p) => p.x - p.y, false);
  const bl = pick((p) => p.x - p.y, true);
  return [tl, tr, br, bl];
}

export function clampQuad(quad: Quad): Quad {
  const c = (p: Point): Point => ({ x: clamp01(p.x), y: clamp01(p.y) });
  return new Quad(c(quad.topLeft), c(quad.topRight), c(quad.bottomRight), c(quad.bottomLeft));
}

export function isFullFrame(quad: Quad, eps = 0.02): boolean {
  return (
    dist(quad.topLeft, { x: 0, y: 0 }) < eps &&
    dist(quad.topRight, { x: 1, y: 0 }) < eps &&
    dist(quad.bottomRight, { x: 1, y: 1 }) < eps &&
    dist(quad.bottomLeft, { x: 0, y: 1 }) < eps
  );
}

export type PixelCrop = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/** Pixel bounding box of a normalized quad, padded so warp has a little margin. */
export function quadBoundingBox(
  quad: Quad,
  imageWidth: number,
  imageHeight: number,
  pad = 0.02,
): PixelCrop {
  const xs = quad.corners.map((c) => c.x * imageWidth);
  const ys = quad.corners.map((c) => c.y * imageHeight);
  const padX = imageWidth * pad;
  const padY = imageHeight * pad;
  const originX = Math.max(0, Math.floor(Math.min(...xs) - padX));
  const originY = Math.max(0, Math.floor(Math.min(...ys) - padY));
  const x2 = Math.min(imageWidth, Math.ceil(Math.max(...xs) + padX));
  const y2 = Math.min(imageHeight, Math.ceil(Math.max(...ys) + padY));
  return {
    originX,
    originY,
    width: Math.max(8, x2 - originX),
    height: Math.max(8, y2 - originY),
  };
}

/** Rewrites a full-image quad into the coordinate space of a cropped region. */
export function remapQuadToCrop(quad: Quad, crop: PixelCrop, imageWidth: number, imageHeight: number): Quad {
  const map = (p: Point): Point => ({
    x: (p.x * imageWidth - crop.originX) / crop.width,
    y: (p.y * imageHeight - crop.originY) / crop.height,
  });
  return new Quad(map(quad.topLeft), map(quad.topRight), map(quad.bottomRight), map(quad.bottomLeft));
}

/** Map normalized image coords onto a cover-fitted camera preview. */
export function mapCover(
  nx: number,
  ny: number,
  viewW: number,
  viewH: number,
  imageW: number,
  imageH: number,
): Point {
  const scale = Math.max(viewW / imageW, viewH / imageH);
  const contentW = imageW * scale;
  const contentH = imageH * scale;
  const ox = (viewW - contentW) / 2;
  const oy = (viewH - contentH) / 2;
  return { x: ox + nx * contentW, y: oy + ny * contentH };
}
