/**
 * Yerel kasa — kullanıcının tüm İZ verisi.
 *
 * Tamamı tarayıcının IndexedDB'sinde durur. Sunucuda kullanıcıya ait
 * hiçbir kayıt tutulmaz: veri tabanı tablosu, oturum, çerez yok.
 * Bu yüzden "verilerimi sil" tek tıkla ve gerçekten tamamlanabilir bir
 * işlemdir — silinecek uzak kopya yoktur.
 */

import { EMPTY_VAULT, type LocalVault } from './types';

const DB_NAME = 'iz-vault';
const DB_VERSION = 1;
const STORE_NAME = 'vault';
const RECORD_KEY = 'main';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB açılamadı.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB isteği başarısız.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('İşlem iptal edildi.'));
    });
  } finally {
    db.close();
  }
}

/** Eksik alanları tamamlar — eski/bozuk kayıtlara karşı dayanıklılık. */
function normalize(value: unknown): LocalVault {
  if (!value || typeof value !== 'object') return structuredClone(EMPTY_VAULT);
  const raw = value as Partial<LocalVault>;
  return {
    version: 1,
    reference: raw.reference ?? null,
    identity: {
      displayName: raw.identity?.displayName ?? '',
      handles: raw.identity?.handles ?? [],
      attestedAt: raw.identity?.attestedAt ?? null,
    },
    scans: raw.scans ?? [],
    findings: raw.findings ?? [],
  };
}

export async function loadVault(): Promise<LocalVault> {
  if (!isBrowser()) return structuredClone(EMPTY_VAULT);
  try {
    const stored = await withStore<unknown>('readonly', (store) => store.get(RECORD_KEY));
    return normalize(stored);
  } catch {
    // Gizli sekme gibi IndexedDB'nin kapalı olduğu ortamlarda uygulama
    // çalışmaya devam etsin; veri sadece kalıcı olmaz.
    return structuredClone(EMPTY_VAULT);
  }
}

export async function saveVault(vault: LocalVault): Promise<void> {
  if (!isBrowser()) return;
  await withStore('readwrite', (store) => store.put(vault, RECORD_KEY));
}

/** Oku-değiştir-yaz. Çağıran taraf kasayı doğrudan mutasyona uğratmamalı. */
export async function updateVault(
  mutate: (vault: LocalVault) => LocalVault
): Promise<LocalVault> {
  const current = await loadVault();
  const next = mutate(structuredClone(current));
  await saveVault(next);
  return next;
}

/** Her şeyi siler: referans yüz, beyanlar, taramalar, bulgular. */
export async function clearVault(): Promise<void> {
  if (!isBrowser()) return;
  await withStore('readwrite', (store) => store.delete(RECORD_KEY));
}

/** Kullanıcının verisini taşınabilir JSON olarak dışa aktarır. */
export function serializeVault(vault: LocalVault): string {
  return JSON.stringify(vault, null, 2);
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
