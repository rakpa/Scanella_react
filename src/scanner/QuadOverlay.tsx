import React from 'react';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import { Lime } from '../theme/colors';
import { Quad, mapCover } from '../scanner/geometry';

export function QuadOverlay({
  quad,
  viewWidth,
  viewHeight,
  imageWidth,
  imageHeight,
  locked,
  progress,
}: {
  quad: Quad;
  viewWidth: number;
  viewHeight: number;
  imageWidth: number;
  imageHeight: number;
  locked: boolean;
  progress: number;
}) {
  if (viewWidth < 8 || viewHeight < 8) return null;

  const map = (nx: number, ny: number) => {
    if (imageWidth > 0 && imageHeight > 0) {
      return mapCover(nx, ny, viewWidth, viewHeight, imageWidth, imageHeight);
    }
    return { x: nx * viewWidth, y: ny * viewHeight };
  };

  const points = quad.corners.map((c) => map(c.x, c.y));
  const poly = points.map((p) => `${p.x},${p.y}`).join(' ');
  const hole = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z';
  const scrim = `M0 0 H${viewWidth} V${viewHeight} H0 Z ${hole}`;

  return (
    <Svg width={viewWidth} height={viewHeight} pointerEvents="none">
      <Path d={scrim} fillRule="evenodd" fill={locked ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.3)'} />
      <Polygon
        points={poly}
        fill={locked ? 'rgba(190,242,100,0.14)' : 'rgba(190,242,100,0.06)'}
        stroke={Lime}
        strokeWidth={locked ? 3 : 2}
        strokeLinejoin="round"
      />
      {points.map((corner, i) => {
        const previous = points[(i + 3) % 4];
        const next = points[(i + 1) % 4];
        return (
          <React.Fragment key={i}>
            <BracketArm from={corner} towards={next} locked={locked} />
            <BracketArm from={corner} towards={previous} locked={locked} />
          </React.Fragment>
        );
      })}
      {progress > 0.01 ? <ProgressRing points={points} progress={progress} /> : null}
    </Svg>
  );
}

function BracketArm({
  from,
  towards,
  locked,
}: {
  from: { x: number; y: number };
  towards: { x: number; y: number };
  locked: boolean;
}) {
  const dx = towards.x - from.x;
  const dy = towards.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const armLength = Math.min(34, Math.max(8, length * 0.22));
  return (
    <Line
      x1={from.x}
      y1={from.y}
      x2={from.x + (dx / length) * armLength}
      y2={from.y + (dy / length) * armLength}
      stroke={Lime}
      strokeWidth={locked ? 5 : 3.5}
      strokeLinecap="round"
    />
  );
}

function ProgressRing({
  points,
  progress,
}: {
  points: { x: number; y: number }[];
  progress: number;
}) {
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cy = points.reduce((s, p) => s + p.y, 0) / 4;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      stroke={Lime}
      strokeWidth={3}
      fill="none"
      strokeDasharray={`${circumference * progress} ${circumference}`}
      strokeLinecap="round"
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}
