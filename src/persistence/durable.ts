/**
 * Durable storage: ask the browser to keep our data from being evicted, and report
 * usage. See FR-P3 / FR-P6. Safe to call in browsers without the Storage API.
 */

export interface StorageStatus {
  /** Whether storage is persisted (won't be auto-cleared under pressure). */
  persisted: boolean;
  /** Estimated bytes used by the origin, if available. */
  usage?: number;
  /** Estimated quota in bytes, if available. */
  quota?: number;
}

/** Request persistent storage. Returns the resulting persisted state. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  const status: StorageStatus = { persisted };
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage !== undefined) status.usage = est.usage;
      if (est.quota !== undefined) status.quota = est.quota;
    } catch {
      /* ignore */
    }
  }
  return status;
}
