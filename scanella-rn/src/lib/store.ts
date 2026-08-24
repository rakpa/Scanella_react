import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Local library: documents made of ordered pages, and the page files
 * themselves.
 *
 * Nothing leaves the device. The scanner hands back pages in a cache the
 * system is free to empty, so a page is copied into the document directory
 * before it is ever recorded in the database — a row pointing at a purged
 * cache file is a page the customer watches disappear.
 */

export type Doc = {
  id: number;
  name: string;
  createdAt: number;
  pageCount: number;
  coverUri: string | null;
};

export type Page = {
  id: number;
  documentId: number;
  position: number;
  uri: string;
};

const PAGES_DIR = 'pages';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function pagesDirectory(): Directory {
  const dir = new Directory(Paths.document, PAGES_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const handle = await SQLite.openDatabaseAsync('scanella.db');
      await handle.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS documents (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pages (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          position    INTEGER NOT NULL,
          uri         TEXT    NOT NULL
        );
        CREATE INDEX IF NOT EXISTS pages_by_document
          ON pages (document_id, position);
      `);
      return handle;
    })();
  }
  return dbPromise;
}

function defaultName(when: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `Scan ${when.getFullYear()}-${pad(when.getMonth() + 1)}-` +
    `${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}`
  );
}

/**
 * Copies each scanned page out of the cache and records the document.
 *
 * Returns the new document's id.
 */
export async function createDocument(sourcePaths: string[]): Promise<number> {
  const handle = await db();
  const dir = pagesDirectory();
  const createdAt = Date.now();

  const stored: string[] = [];
  for (let i = 0; i < sourcePaths.length; i++) {
    const source = new File(sourcePaths[i]);
    const extension = source.extension || '.jpg';
    const target = new File(dir, `${createdAt}-${i}${extension}`);
    await source.copy(target);
    stored.push(target.uri);
  }

  let documentId = 0;
  await handle.withTransactionAsync(async () => {
    const result = await handle.runAsync(
      'INSERT INTO documents (name, created_at) VALUES (?, ?)',
      defaultName(new Date(createdAt)),
      createdAt
    );
    documentId = result.lastInsertRowId;

    for (let i = 0; i < stored.length; i++) {
      await handle.runAsync(
        'INSERT INTO pages (document_id, position, uri) VALUES (?, ?, ?)',
        documentId,
        i,
        stored[i]
      );
    }
  });

  return documentId;
}

export async function listDocuments(): Promise<Doc[]> {
  const handle = await db();
  const rows = await handle.getAllAsync<{
    id: number;
    name: string;
    created_at: number;
    page_count: number;
    cover_uri: string | null;
  }>(`
    SELECT d.id,
           d.name,
           d.created_at,
           COUNT(p.id) AS page_count,
           MIN(CASE WHEN p.position = 0 THEN p.uri END) AS cover_uri
      FROM documents d
      LEFT JOIN pages p ON p.document_id = d.id
     GROUP BY d.id
     ORDER BY d.created_at DESC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    pageCount: r.page_count,
    coverUri: r.cover_uri,
  }));
}

export async function getPages(documentId: number): Promise<Page[]> {
  const handle = await db();
  const rows = await handle.getAllAsync<{
    id: number;
    document_id: number;
    position: number;
    uri: string;
  }>(
    'SELECT id, document_id, position, uri FROM pages WHERE document_id = ? ORDER BY position',
    documentId
  );
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    position: r.position,
    uri: r.uri,
  }));
}

export async function getDocument(id: number): Promise<Doc | null> {
  const all = await listDocuments();
  return all.find((d) => d.id === id) ?? null;
}

export async function renameDocument(id: number, name: string): Promise<void> {
  const handle = await db();
  await handle.runAsync('UPDATE documents SET name = ? WHERE id = ?', name, id);
}

export async function deleteDocument(id: number): Promise<void> {
  const handle = await db();
  const pages = await getPages(id);

  // Files first: a row deleted before its file leaves the file orphaned with
  // nothing left pointing at it to clean up later.
  for (const page of pages) {
    try {
      const file = new File(page.uri);
      if (file.exists) file.delete();
    } catch {
      // A page file already gone is the state we wanted anyway.
    }
  }

  await handle.withTransactionAsync(async () => {
    await handle.runAsync('DELETE FROM pages WHERE document_id = ?', id);
    await handle.runAsync('DELETE FROM documents WHERE id = ?', id);
  });
}
