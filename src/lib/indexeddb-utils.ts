/**
 * IndexedDBのデータベース名
 */
const DB_NAME = "better-tab";

/**
 * IndexedDBのバージョン
 */
const DB_VERSION = 2;

/**
 * ストア名の定義
 */
export const STORE_NAMES = {
  APP_SETTINGS: "app_settings",
  BACKGROUND_IMAGES: "background_images",
  BACKGROUND_SETTINGS: "background_settings",
  SHORTCUTS: "shortcuts",
} as const;

/**
 * IndexedDBのデータベースインスタンスを取得する
 *
 * @returns {Promise<IDBDatabase>} IndexedDBのデータベースインスタンス
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // ストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(STORE_NAMES.APP_SETTINGS)) {
        db.createObjectStore(STORE_NAMES.APP_SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.BACKGROUND_IMAGES)) {
        db.createObjectStore(STORE_NAMES.BACKGROUND_IMAGES);
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.BACKGROUND_SETTINGS)) {
        db.createObjectStore(STORE_NAMES.BACKGROUND_SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.SHORTCUTS)) {
        db.createObjectStore(STORE_NAMES.SHORTCUTS);
      }
    };
  });
}

/**
 * IndexedDBにデータを保存する
 *
 * @param {string} storeName - ストア名
 * @param {string} key - キー
 * @param {unknown} value - 保存する値
 * @returns {Promise<void>}
 */
export async function setItem(
  storeName: string,
  key: string,
  value: unknown
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);

    request.onerror = () => {
      reject(new Error(`Failed to set item: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * IndexedDBからデータを取得する
 *
 * @param {string} storeName - ストア名
 * @param {string} key - キー
 * @returns {Promise<unknown>} 取得した値（存在しない場合はundefined）
 */
export async function getItem(
  storeName: string,
  key: string
): Promise<unknown> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => {
      reject(new Error(`Failed to get item: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * IndexedDBからデータを削除する
 *
 * @param {string} storeName - ストア名
 * @param {string} key - キー
 * @returns {Promise<void>}
 */
export async function removeItem(
  storeName: string,
  key: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => {
      reject(new Error(`Failed to remove item: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


