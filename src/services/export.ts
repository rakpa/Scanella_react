import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { ScanDocument } from '../types';

function fileNameFor(doc: ScanDocument) {
  return doc.title.replace(/[^\w\s-]+/g, '').trim() || 'Scanella';
}

async function htmlFor(doc: ScanDocument) {
  const pages = doc.pages
    .map(
      (page) =>
        `<div class="page"><img src="${page.path}" /></div>`,
    )
    .join('');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      .page { page-break-after: always; }
      img { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>${pages}</body>
</html>`;
}

export async function sharePdf(doc: ScanDocument) {
  const { uri } = await Print.printToFileAsync({ html: await htmlFor(doc) });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: fileNameFor(doc),
    UTI: 'com.adobe.pdf',
  });
}

export async function shareImages(doc: ScanDocument) {
  for (const page of doc.pages) {
    await Sharing.shareAsync(page.path, { mimeType: 'image/jpeg' });
  }
}

export async function saveToPhotos(doc: ScanDocument) {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photos access was declined.');
  }
  let saved = 0;
  for (const page of doc.pages) {
    await MediaLibrary.saveToLibraryAsync(page.path);
    saved += 1;
  }
  return saved;
}
