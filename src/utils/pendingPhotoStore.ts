/**
 * Guarda local (IndexedDB) das fotos que ainda não subiram.
 *
 * localStorage não aceita `File`/`Blob`; por isso as fotos selecionadas que
 * falharam no upload são preservadas em IndexedDB. Ao retomar a finalização no
 * MESMO aparelho, elas voltam para o formulário e podem ser reenviadas sem o
 * técnico precisar refazer as fotos. Em outro dispositivo, o backend continua
 * sendo a fonte das URLs já enviadas e a tela informa quando é necessário
 * selecionar novamente.
 *
 * Todas as funções degradam para "indisponível" em navegador privado, cota
 * cheia ou ambiente sem IndexedDB — nunca lançam.
 */

const DB_NAME = "csdt-os-externa";
const DB_VERSION = 1;
const STORE = "pending-photos";

export interface PendingPhotos {
  fotosAntes: File[];
  fotosDepois: File[];
}

interface PendingPhotosRecord extends PendingPhotos {
  numeroOs: string;
  savedAt: number;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) return;
      settled = true;
      resolve(db);
    };

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "numeroOs" });
        }
      };
      request.onsuccess = () => finish(request.result);
      request.onerror = () => finish(null);
      // Ambientes que bloqueiam IndexedDB às vezes não disparam evento algum.
      setTimeout(() => finish(null), 3000);
    } catch {
      finish(null);
    }
  });
}

export async function savePendingPhotos(
  numeroOs: string,
  photos: PendingPhotos
): Promise<boolean> {
  if (!numeroOs) return false;
  const hasPhotos = photos.fotosAntes.length > 0 || photos.fotosDepois.length > 0;
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      if (!hasPhotos) store.delete(numeroOs);
      else {
        const record: PendingPhotosRecord = {
          numeroOs,
          fotosAntes: photos.fotosAntes,
          fotosDepois: photos.fotosDepois,
          savedAt: Date.now(),
        };
        store.put(record);
      }
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    } catch {
      resolve(false);
    } finally {
      setTimeout(() => db.close(), 1000);
    }
  });
}

export async function loadPendingPhotos(numeroOs: string): Promise<PendingPhotos> {
  const empty: PendingPhotos = { fotosAntes: [], fotosDepois: [] };
  if (!numeroOs) return empty;
  const db = await openDb();
  if (!db) return empty;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(numeroOs);
      request.onsuccess = () => {
        const record = request.result as PendingPhotosRecord | undefined;
        resolve({
          fotosAntes: Array.isArray(record?.fotosAntes) ? record!.fotosAntes : [],
          fotosDepois: Array.isArray(record?.fotosDepois) ? record!.fotosDepois : [],
        });
      };
      request.onerror = () => resolve(empty);
      transaction.onabort = () => resolve(empty);
    } catch {
      resolve(empty);
    } finally {
      setTimeout(() => db.close(), 1000);
    }
  });
}

export async function clearPendingPhotos(numeroOs: string): Promise<void> {
  if (!numeroOs) return;
  const db = await openDb();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(numeroOs);
  } catch {
    // ignora
  } finally {
    setTimeout(() => db.close(), 1000);
  }
}

export async function hasPendingPhotos(numeroOs: string): Promise<boolean> {
  const photos = await loadPendingPhotos(numeroOs);
  return photos.fotosAntes.length + photos.fotosDepois.length > 0;
}
