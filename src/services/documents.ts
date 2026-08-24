import { Directory, File, Paths } from 'expo-file-system';
import { nextId } from '../store/useAppStore';
import { ScanDocument, ScanFilter, ScanPage } from '../types';

function docsRoot() {
  return new Directory(Paths.document, 'documents');
}

async function copyInto(dir: Directory, uri: string, name: string) {
  const dest = new File(dir, name);
  try {
    const source = new File(uri);
    await source.copy(dest, { overwrite: true });
    return dest.uri;
  } catch {
    return uri;
  }
}

export async function persistScans(
  uris: string[],
  options: {
    title: string;
    filter: ScanFilter;
    edgesAlreadyApplied?: boolean;
  },
): Promise<ScanDocument> {
  const id = nextId();
  const root = docsRoot();
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
  const dir = new Directory(root, id);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const pages: ScanPage[] = [];
  for (let i = 0; i < uris.length; i += 1) {
    const path = await copyInto(dir, uris[i], `page-${i + 1}.jpg`);
    const originalPath = await copyInto(dir, uris[i], `original-${i + 1}.jpg`);
    pages.push({
      id: nextId(),
      path,
      originalPath,
      filter: options.filter,
      brightness: 0,
      contrast: 0,
    });
  }

  return {
    id,
    title: options.title,
    createdAt: new Date().toISOString(),
    pages,
    edgesAlreadyApplied: options.edgesAlreadyApplied ?? true,
  };
}
