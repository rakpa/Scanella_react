import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';

import type { Page } from './store';

/**
 * Export: pages out as a PDF, or a single page out as an image.
 *
 * The PDF is built by printing an HTML page per scan. Each page is embedded
 * as a data URI rather than linked: the print renderer resolves relative file
 * URLs against its own context, not the app's, so a linked page comes out
 * blank on device while looking correct in a preview.
 */

function pageHtml(dataUri: string): string {
  // object-fit: contain keeps a portrait scan from being stretched to the
  // sheet's aspect, which is the difference between a scan and a photocopy of
  // a scan.
  return `
    <div class="page">
      <img src="${dataUri}" />
    </div>`;
}

async function toDataUri(uri: string): Promise<string> {
  const file = new File(uri);
  const base64 = await file.base64();
  const extension = file.extension.replace('.', '').toLowerCase();
  const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function buildPdf(pages: Page[], name: string): Promise<string> {
  const blocks = await Promise.all(pages.map((p) => toDataUri(p.uri)));

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          body { margin: 0; }
          .page {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
          }
          .page:last-child { page-break-after: auto; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>${blocks.map(pageHtml).join('')}</body>
    </html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // printToFileAsync names the file after a temporary id, which is what the
  // share sheet would then offer as the filename.
  const source = new File(uri);
  const target = new File(source.parentDirectory, `${safeName(name)}.pdf`);
  if (target.exists) target.delete();
  await source.move(target);
  return target.uri;
}

function safeName(name: string): string {
  return name.replace(/[^\w\-. ]+/g, '').trim() || 'Scan';
}

export async function sharePdf(pages: Page[], name: string): Promise<void> {
  const uri = await buildPdf(pages, name);
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: name,
  });
}

export async function sharePage(page: Page): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(page.uri, {
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
  });
}
