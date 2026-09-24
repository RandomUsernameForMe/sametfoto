const KEY = 'archive';

const db = () =>
  new Promise<IDBDatabase>((res, rej) => {
    const req = indexedDB.open('sametfoto', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

const kv = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest) => {
  const store = (await db()).transaction('kv', mode).objectStore('kv');
  return new Promise<T>((res, rej) => {
    const req = fn(store);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};

export const getArchive = () => kv<FileSystemDirectoryHandle | undefined>('readonly', (s) => s.get(KEY));

export const pickArchive = async () => {
  const dir = await window.showDirectoryPicker({ id: 'archive', mode: 'readwrite' });
  await kv('readwrite', (s) => s.put(dir, KEY));
  return dir;
};

/** Volat přímo z kliknutí — requestPermission vyžaduje user gesture */
export const ensureArchiveAccess = async () => {
  const dir = await getArchive();
  if (!dir) return undefined;
  const opts = { mode: 'readwrite' } as const;
  if ((await dir.queryPermission(opts)) === 'granted') return dir;
  return (await dir.requestPermission(opts)) === 'granted' ? dir : undefined;
};

export const saveToArchive = async (dir: FileSystemDirectoryHandle, folder: string, name: string, canvas: HTMLCanvasElement) => {
  const sub = await dir.getDirectoryHandle(folder, { create: true });
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92));
  const w = await (await sub.getFileHandle(name, { create: true })).createWritable();
  await w.write(blob);
  await w.close();
};
