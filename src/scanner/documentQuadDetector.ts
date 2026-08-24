/**
 * Port of scan2 `lib/features/camera/domain/document_quad_detector.dart`.
 *
 * Pure JS document boundary detector (no ML / OpenCV). Constants, polarity-split
 * Hough voting, edge-support scoring, and blob fallback are the same as scan2.
 */
import { Point, Quad, orderCorners } from './geometry';

export type QuadDetection = {
  corners: Point[];
  confidence: number;
};

type EdgeSupport = {
  consistency: number;
  contrast: number;
};

type Component = {
  area: number;
  pixels: number[];
};

type HoughLine = {
  slope: number;
  intercept: number;
  votes: number;
};

function positionAt(line: HoughLine, t: number): number {
  return line.slope * t + line.intercept;
}

const MIN_AREA_RATIO = 0.03;
const MIN_EXTENT_RATIO = 0.11;
const THRESHOLD_FRACTIONS = [0.3, 0.12, 0.05];
const CONFIDENT_ENOUGH = 0.74;
const NOISE_FLOOR = 3.0;
const FULL_STEP = 14.0;
const MAX_SLOPE = 0.6;
const SLOPE_BINS = 21;
const LINES_PER_SIDE = 8;

export class DocumentQuadDetector {
  detect(lum: Uint8Array, width: number, height: number): QuadDetection | null {
    if (width < 16 || height < 16 || lum.length < width * height) return null;

    const blurred = boxBlur3(lum, width, height);
    const lineResult = detectByLines(blurred, width, height);
    if (lineResult) return lineResult;
    return detectByBlob(blurred, width, height);
  }
}

function detectByLines(lum: Uint8Array, w: number, h: number): QuadDetection | null {
  const gx = new Int16Array(w * h);
  const gy = new Int16Array(w * h);
  const magHistogram = new Int32Array(512);
  let magCount = 0;
  for (let y = 1; y < h - 1; y += 1) {
    const r0 = (y - 1) * w;
    const r1 = y * w;
    const r2 = (y + 1) * w;
    for (let x = 1; x < w - 1; x += 1) {
      const a = lum[r0 + x - 1];
      const b = lum[r0 + x];
      const c = lum[r0 + x + 1];
      const d = lum[r1 + x - 1];
      const f = lum[r1 + x + 1];
      const g = lum[r2 + x - 1];
      const hh = lum[r2 + x];
      const i = lum[r2 + x + 1];
      const sx = c + 2 * f + i - (a + 2 * d + g);
      const sy = g + 2 * hh + i - (a + 2 * b + c);
      gx[r1 + x] = sx;
      gy[r1 + x] = sy;
      magHistogram[Math.min(511, (Math.abs(sx) + Math.abs(sy)) >> 2)] += 1;
      magCount += 1;
    }
  }
  if (magCount === 0) return null;

  const strongTarget = Math.max(1, Math.round(magCount * 0.02));
  let strongLevel = 0;
  let running = 0;
  for (let bucket = 511; bucket >= 0; bucket -= 1) {
    running += magHistogram[bucket];
    if (running >= strongTarget) {
      strongLevel = bucket << 2;
      break;
    }
  }

  let best: QuadDetection | null = null;
  for (const fraction of THRESHOLD_FRACTIONS) {
    const threshold = Math.max(20, strongLevel * fraction);
    const candidate = detectAtThreshold(lum, gx, gy, w, h, threshold);
    if (!candidate) continue;
    if (!best || candidate.confidence > best.confidence) best = candidate;
    if (candidate.confidence >= CONFIDENT_ENOUGH) return candidate;
  }
  return best;
}

function detectAtThreshold(
  lum: Uint8Array,
  gx: Int16Array,
  gy: Int16Array,
  w: number,
  h: number,
  threshold: number,
): QuadDetection | null {
  const bOffset = Math.ceil(MAX_SLOPE * h);
  const bCount = w + 2 * bOffset;
  const dOffset = Math.ceil(MAX_SLOPE * w);
  const dCount = h + 2 * dOffset;
  const accVPos = new Int32Array(SLOPE_BINS * bCount);
  const accVNeg = new Int32Array(SLOPE_BINS * bCount);
  const accHPos = new Int32Array(SLOPE_BINS * dCount);
  const accHNeg = new Int32Array(SLOPE_BINS * dCount);
  const slopeStep = (2 * MAX_SLOPE) / (SLOPE_BINS - 1);

  for (let y = 1; y < h - 1; y += 1) {
    const row = y * w;
    for (let x = 1; x < w - 1; x += 1) {
      const sx = gx[row + x];
      const sy = gy[row + x];
      const mag = Math.abs(sx) + Math.abs(sy);
      if (mag < threshold) continue;

      if (Math.abs(sx) >= Math.abs(sy)) {
        const acc = sx > 0 ? accVPos : accVNeg;
        for (let s = 0; s < SLOPE_BINS; s += 1) {
          const a = -MAX_SLOPE + s * slopeStep;
          const b = Math.round(x - a * y + bOffset);
          if (b >= 0 && b < bCount) acc[s * bCount + b] += 1;
        }
      } else {
        const acc = sy > 0 ? accHPos : accHNeg;
        for (let s = 0; s < SLOPE_BINS; s += 1) {
          const c = -MAX_SLOPE + s * slopeStep;
          const d = Math.round(y - c * x + dOffset);
          if (d >= 0 && d < dCount) acc[s * dCount + d] += 1;
        }
      }
    }
  }

  const minVotesV = Math.max(5, Math.round(MIN_EXTENT_RATIO * 0.7 * h));
  const minVotesH = Math.max(5, Math.round(MIN_EXTENT_RATIO * 0.7 * w));
  const vPos = topLines(accVPos, bCount, bOffset, minVotesV);
  const vNeg = topLines(accVNeg, bCount, bOffset, minVotesV);
  const hPos = topLines(accHPos, dCount, dOffset, minVotesH);
  const hNeg = topLines(accHNeg, dCount, dOffset, minVotesH);

  return (
    bestCandidate(lum, w, h, vPos, vNeg, hPos, hNeg, true) ??
    bestCandidate(lum, w, h, vNeg, vPos, hNeg, hPos, false)
  );
}

function bestCandidate(
  lum: Uint8Array,
  w: number,
  h: number,
  leftLines: HoughLine[],
  rightLines: HoughLine[],
  topLinesList: HoughLine[],
  bottomLines: HoughLine[],
  pageIsBright: boolean,
): QuadDetection | null {
  if (!leftLines.length || !rightLines.length || !topLinesList.length || !bottomLines.length) {
    return null;
  }

  let best: QuadDetection | null = null;
  let bestScore = 0;

  for (const left of leftLines) {
    for (const right of rightLines) {
      const lx = positionAt(left, h / 2);
      const rx = positionAt(right, h / 2);
      if (rx - lx < MIN_EXTENT_RATIO * w) continue;
      if (Math.abs(left.slope - right.slope) > 0.5) continue;

      for (const top of topLinesList) {
        for (const bottom of bottomLines) {
          const ty = positionAt(top, w / 2);
          const by = positionAt(bottom, w / 2);
          if (by - ty < MIN_EXTENT_RATIO * h) continue;
          if (Math.abs(top.slope - bottom.slope) > 0.5) continue;

          const corners: Point[] = [];
          let degenerate = false;
          for (const v of [left, right]) {
            for (const hLine of [top, bottom]) {
              const p = intersect(v, hLine);
              if (!p) {
                degenerate = true;
                break;
              }
              corners.push(p);
            }
            if (degenerate) break;
          }
          if (degenerate) continue;

          let outOfFrame = false;
          for (const p of corners) {
            if (p.x < -0.25 * w || p.x > 1.25 * w) outOfFrame = true;
            if (p.y < -0.25 * h || p.y > 1.25 * h) outOfFrame = true;
          }
          if (outOfFrame) continue;

          const ordered = orderCorners(corners);
          if (!isConvex(ordered)) continue;

          const areaRatio = polygonArea(ordered) / (w * h);
          if (areaRatio < MIN_AREA_RATIO || areaRatio > 0.99) continue;

          const support = signedEdgeSupport(lum, w, h, ordered, pageIsBright);
          if (support.consistency < 0.46) continue;

          const score =
            support.consistency * 0.55 +
            Math.min(support.contrast / 40, 1) * 0.25 +
            Math.min(areaRatio * 1.6, 1) * 0.2;

          if (score > bestScore) {
            bestScore = score;
            best = {
              corners: ordered.map((p) => ({
                x: clamp(p.x / w, 0, 1),
                y: clamp(p.y / h, 0, 1),
              })),
              confidence: clamp(score, 0, 0.98),
            };
          }
        }
      }
    }
  }

  if (!best || bestScore < 0.45) return null;
  return best;
}

function topLines(acc: Int32Array, interceptCount: number, offset: number, minVotes: number): HoughLine[] {
  const lines: HoughLine[] = [];
  const working = new Int32Array(acc);

  const smoothed = (s: number, b: number) => {
    let v = working[s * interceptCount + b];
    if (b > 0) v += working[s * interceptCount + b - 1];
    if (b < interceptCount - 1) v += working[s * interceptCount + b + 1];
    return v;
  };

  for (let n = 0; n < LINES_PER_SIDE; n += 1) {
    let bestVotes = 0;
    let bestS = -1;
    let bestB = -1;
    for (let s = 0; s < SLOPE_BINS; s += 1) {
      for (let b = 1; b < interceptCount - 1; b += 1) {
        const v = smoothed(s, b);
        if (v > bestVotes) {
          bestVotes = v;
          bestS = s;
          bestB = b;
        }
      }
    }
    if (bestVotes < minVotes) break;

    lines.push({
      slope: -MAX_SLOPE + bestS * ((2 * MAX_SLOPE) / (SLOPE_BINS - 1)),
      intercept: bestB - offset,
      votes: bestVotes,
    });

    const s0 = Math.max(0, bestS - 3);
    const s1 = Math.min(SLOPE_BINS - 1, bestS + 3);
    const b0 = Math.max(0, bestB - 8);
    const b1 = Math.min(interceptCount - 1, bestB + 8);
    for (let s = s0; s <= s1; s += 1) {
      for (let b = b0; b <= b1; b += 1) {
        working[s * interceptCount + b] = 0;
      }
    }
  }
  return lines;
}

function intersect(vertical: HoughLine, horizontal: HoughLine): Point | null {
  const a = vertical.slope;
  const b = vertical.intercept;
  const c = horizontal.slope;
  const d = horizontal.intercept;
  const denom = 1 - a * c;
  if (Math.abs(denom) < 1e-6) return null;
  const x = (a * d + b) / denom;
  const y = c * x + d;
  return { x, y };
}

function detectByBlob(blurred: Uint8Array, width: number, height: number): QuadDetection | null {
  const { mean: bg, spread: bgSpread } = borderStats(blurred, width, height);
  const threshold = Math.max(14, bgSpread * 2.2 + 6);

  const mask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      if (Math.abs(blurred[row + x] - bg) > threshold) mask[row + x] = 1;
    }
  }

  const component = largestComponent(mask, width, height);
  if (!component) return null;

  const areaRatio = component.area / (width * height);
  if (areaRatio < MIN_AREA_RATIO) return null;

  const corners = extremeCorners(component, width);
  if (!corners || !isConvex(corners)) return null;

  const quadArea = polygonArea(corners);
  const quadAreaRatio = quadArea / (width * height);
  if (quadAreaRatio < MIN_AREA_RATIO) return null;

  const solidity = clamp(component.area / Math.max(quadArea, 1), 0, 1);
  if (solidity < 0.62) return null;

  const bright = signedEdgeSupport(blurred, width, height, corners, true);
  const dark = signedEdgeSupport(blurred, width, height, corners, false);
  const support = bright.consistency >= dark.consistency ? bright : dark;
  if (support.consistency < 0.45) return null;

  const confidence = clamp(
    0.15 + 0.4 * support.consistency + 0.25 * solidity + 0.1 * Math.min(quadAreaRatio * 2.5, 1),
    0,
    0.85,
  );

  const normalized = corners.map((c) => ({
    x: clamp(c.x / width, 0, 1),
    y: clamp(c.y / height, 0, 1),
  }));

  return {
    corners: orderCorners(normalized),
    confidence,
  };
}

function boxBlur3(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = Math.max(0, y - 1) * w;
    const y1 = y * w;
    const y2 = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x += 1) {
      const x0 = Math.max(0, x - 1);
      const x2 = Math.min(w - 1, x + 1);
      const sum =
        src[y0 + x0] +
        src[y0 + x] +
        src[y0 + x2] +
        src[y1 + x0] +
        src[y1 + x] +
        src[y1 + x2] +
        src[y2 + x0] +
        src[y2 + x] +
        src[y2 + x2];
      out[y1 + x] = Math.floor(sum / 9);
    }
  }
  return out;
}

function borderStats(lum: Uint8Array, w: number, h: number): { mean: number; spread: number } {
  let sum = 0;
  let count = 0;
  const sample = (x: number, y: number) => {
    sum += lum[y * w + x];
    count += 1;
  };
  for (let t = 0; t < 2; t += 1) {
    for (let x = 0; x < w; x += 1) {
      sample(x, t);
      sample(x, h - 1 - t);
    }
    for (let y = 2; y < h - 2; y += 1) {
      sample(t, y);
      sample(w - 1 - t, y);
    }
  }
  const mean = count === 0 ? 128 : sum / count;

  let dev = 0;
  for (let t = 0; t < 2; t += 1) {
    for (let x = 0; x < w; x += 1) {
      dev += Math.abs(lum[t * w + x] - mean);
      dev += Math.abs(lum[(h - 1 - t) * w + x] - mean);
    }
    for (let y = 2; y < h - 2; y += 1) {
      dev += Math.abs(lum[y * w + t] - mean);
      dev += Math.abs(lum[y * w + (w - 1 - t)] - mean);
    }
  }
  return { mean, spread: count === 0 ? 0 : dev / count };
}

function largestComponent(mask: Uint8Array, w: number, h: number): Component | null {
  const labels = new Int32Array(w * h);
  let nextLabel = 0;
  let best: Component | null = null;
  const stack: number[] = [];

  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 0 || labels[i] !== 0) continue;
    nextLabel += 1;
    let area = 0;
    const pixels: number[] = [];
    stack.push(i);
    labels[i] = nextLabel;

    while (stack.length) {
      const p = stack.pop()!;
      area += 1;
      pixels.push(p);
      const px = p % w;
      const py = Math.floor(p / w);
      if (px > 0) tryPush(p - 1, mask, labels, nextLabel, stack);
      if (px < w - 1) tryPush(p + 1, mask, labels, nextLabel, stack);
      if (py > 0) tryPush(p - w, mask, labels, nextLabel, stack);
      if (py < h - 1) tryPush(p + w, mask, labels, nextLabel, stack);
    }

    if (!best || area > best.area) best = { area, pixels };
  }
  return best;
}

function tryPush(index: number, mask: Uint8Array, labels: Int32Array, label: number, stack: number[]) {
  if (mask[index] !== 0 && labels[index] === 0) {
    labels[index] = label;
    stack.push(index);
  }
}

function extremeCorners(component: Component, w: number): Point[] | null {
  if (component.pixels.length < 12) return null;

  let tl = component.pixels[0];
  let tr = tl;
  let br = tl;
  let bl = tl;
  let tlScore = Infinity;
  let brScore = -Infinity;
  let trScore = -Infinity;
  let blScore = Infinity;

  for (const p of component.pixels) {
    const x = p % w;
    const y = Math.floor(p / w);
    const sum = x + y;
    const diff = x - y;
    if (sum < tlScore) {
      tlScore = sum;
      tl = p;
    }
    if (sum > brScore) {
      brScore = sum;
      br = p;
    }
    if (diff > trScore) {
      trScore = diff;
      tr = p;
    }
    if (diff < blScore) {
      blScore = diff;
      bl = p;
    }
  }

  const toOffset = (p: number): Point => ({ x: p % w, y: Math.floor(p / w) });
  const corners = [toOffset(tl), toOffset(tr), toOffset(br), toOffset(bl)];
  for (let i = 0; i < 4; i += 1) {
    if (Math.hypot(corners[i].x - corners[(i + 1) % 4].x, corners[i].y - corners[(i + 1) % 4].y) < 4) {
      return null;
    }
  }
  return corners;
}

function isConvex(quad: Point[]): boolean {
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const c = cross(quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
    if (Math.abs(c) < 1e-6) continue;
    const s = c > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
}

function polygonArea(quad: Point[]): number {
  let area = 0;
  for (let i = 0; i < quad.length; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function signedEdgeSupport(
  lum: Uint8Array,
  w: number,
  h: number,
  corners: Point[],
  pageIsBright: boolean,
): EdgeSupport {
  const lumAt = (x: number, y: number) => {
    const xi = clamp(Math.round(x), 0, w - 1);
    const yi = clamp(Math.round(y), 0, h - 1);
    return lum[yi * w + xi];
  };

  const probe = Math.max(2, Math.min(w, h) * 0.02);
  const center = {
    x: corners.reduce((s, c) => s + c.x, 0) / 4,
    y: corners.reduce((s, c) => s + c.y, 0) / 4,
  };

  let weakestEdge = 1;
  let supportSum = 0;
  let contrastSum = 0;
  let edgeCount = 0;
  let sampleCount = 0;

  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const edge = { x: b.x - a.x, y: b.y - a.y };
    const len = Math.hypot(edge.x, edge.y);
    if (len < 1) continue;

    let normal = { x: -edge.y / len, y: edge.x / len };
    const mid = { x: a.x + edge.x * 0.5, y: a.y + edge.y * 0.5 };
    const outDist = Math.hypot(mid.x + normal.x - center.x, mid.y + normal.y - center.y);
    const inDist = Math.hypot(mid.x - normal.x - center.x, mid.y - normal.y - center.y);
    if (outDist < inDist) normal = { x: -normal.x, y: -normal.y };

    const steps = Math.max(8, Math.floor(len / 3));
    let edgeSupport = 0;
    let edgeSamples = 0;

    for (let s = 2; s < steps - 1; s += 1) {
      const t = s / steps;
      const p = { x: a.x + edge.x * t, y: a.y + edge.y * t };
      const inside = lumAt(p.x - normal.x * probe, p.y - normal.y * probe);
      const outside = lumAt(p.x + normal.x * probe, p.y + normal.y * probe);
      const diff = pageIsBright ? inside - outside : outside - inside;
      const graded = diff <= NOISE_FLOOR ? 0 : Math.min(1, (diff - NOISE_FLOOR) / FULL_STEP);
      edgeSupport += graded;
      contrastSum += diff;
      edgeSamples += 1;
      sampleCount += 1;
    }

    if (edgeSamples === 0) continue;
    const normalized = edgeSupport / edgeSamples;
    weakestEdge = Math.min(weakestEdge, normalized);
    supportSum += normalized;
    edgeCount += 1;
  }

  if (edgeCount === 0 || sampleCount === 0) return { consistency: 0, contrast: 0 };
  const mean = supportSum / edgeCount;
  return {
    consistency: 0.35 * mean + 0.65 * weakestEdge,
    contrast: contrastSum / sampleCount,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const detector = new DocumentQuadDetector();

/** Live-preview analysis width, matching scan2 CameraFrameAnalyzer. */
export const ANALYSIS_WIDTH = 240;

/** Still-image analysis longest edge, matching scan2 PageProcessor. */
export const STILL_ANALYSIS_EDGE = 320;

export function detectFromLuminance(lum: Uint8Array, width: number, height: number): QuadDetection | null {
  return detector.detect(lum, width, height);
}

export function detectionToQuad(detection: QuadDetection, inset = 0.006): Quad {
  return Quad.fromCorners(detection.corners).shrink(inset);
}
