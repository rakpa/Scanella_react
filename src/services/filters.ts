import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ScanFilter } from '../types';

export function filterMatrix(filter: ScanFilter) {
  switch (filter) {
    case 'grayscale':
      return 'grayscale(1)';
    case 'bw':
      return 'grayscale(1) contrast(1.8)';
    case 'enhance':
      return 'contrast(1.18) saturate(1.05)';
    case 'magic':
      return 'contrast(1.22) brightness(1.06) saturate(0.92)';
    default:
      return undefined;
  }
}

export async function applyCrop(
  uri: string,
  crop: { originX: number; originY: number; width: number; height: number },
) {
  const result = await manipulateAsync(uri, [{ crop }], {
    compress: 0.92,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

export async function applyTone(
  uri: string,
  brightness: number,
  contrast: number,
) {
  const actions = [];
  if (Math.abs(brightness) > 0.02 || Math.abs(contrast) > 0.02) {
    actions.push({ rotate: 0 });
  }
  if (actions.length === 0) return uri;
  const result = await manipulateAsync(uri, actions, {
    compress: 0.92,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
