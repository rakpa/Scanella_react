/**
 * Synthetic check that the scan2 detector port finds a page on a dark desk.
 * Run with: npx tsx scripts/verify-detector.ts
 */
import { DocumentQuadDetector } from '../src/scanner/documentQuadDetector';
import { applyAdjustments } from '../src/scanner/imageProcessor';
import { Raster } from '../src/scanner/raster';
import { warpRaster } from '../src/scanner/perspective';
import { Quad } from '../src/scanner/geometry';

function makePage(w: number, h: number): Uint8Array {
  const lum = new Uint8Array(w * h);
  lum.fill(38);
  const x0 = Math.round(w * 0.18);
  const x1 = Math.round(w * 0.84);
  const y0 = Math.round(h * 0.16);
  const y1 = Math.round(h * 0.86);
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      lum[y * w + x] = 228;
    }
  }
  return lum;
}

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const w = 240;
const h = 180;
const detection = new DocumentQuadDetector().detect(makePage(w, h), w, h);
console.log('detection', detection);
assert(!!detection, 'detector returned null on a high-contrast page');
assert(detection!.confidence >= 0.45, `confidence too low: ${detection!.confidence}`);

const xs = detection!.corners.map((c) => c.x);
const ys = detection!.corners.map((c) => c.y);
assert(Math.min(...xs) < 0.28 && Math.max(...xs) > 0.72, `x corners off: ${xs.join(',')}`);
assert(Math.min(...ys) < 0.28 && Math.max(...ys) > 0.72, `y corners off: ${ys.join(',')}`);

const raster = new Raster(80, 60);
raster.pixels.fill(200);
for (let i = 0; i < raster.pixels.length; i += 3) {
  raster.pixels[i] = 210;
  raster.pixels[i + 1] = 190;
  raster.pixels[i + 2] = 160;
}
const magic = applyAdjustments(raster, { filter: 'magic', brightness: 0, contrast: 0 });
assert(magic.width === 80 && magic.height === 60, 'magic filter lost dimensions');
const bw = applyAdjustments(raster, { filter: 'bw', brightness: 0, contrast: 0 });
assert(bw.pixels[0] === bw.pixels[1] && bw.pixels[1] === bw.pixels[2], 'b&w is not gray');

const warped = warpRaster(
  raster,
  new Quad({ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.12 }, { x: 0.88, y: 0.9 }, { x: 0.08, y: 0.88 }),
);
assert(!!warped && warped.width > 20 && warped.height > 20, 'warp failed');

console.log('scan2 detector + filters + warp: ok');
