"use client";

/**
 * Minimal IndexedDB wrapper for Astra's session autosave/recovery.
 * Stores at most ONE session at a time (Sprint 3 scope: single active
 * editing session, not a project library). No framework dependency,
 * matches the pattern used elsewhere in Astra of small, focused
 * modules over a heavier library.
 */

const DB_NAME = "astra-session";
const DB_VERSION = 1;
const STORE_NAME = "session";
const SESSION_KEY = "current";

export interface PersistedSession {
  savedAt: number; // epoch ms
  assetId: string;
  assetName: string;
  assetUrl?: string;
  /** The full serializable editor document (EditorDocument) at save time -- the ACTIVE page's, for back-compat with pre-multi-page sessions. */
  document: unknown;
  /**
   * An AI job that was still in flight the last time we saved (Sprint 4
   * Track D). Cleared as soon as the job reaches a terminal state --
   * so a stale entry here always means "was genuinely still running
   * (or its outcome is unknown) as of the last autosave", never a
   * leftover from a completed generation.
   */
  activeAiJobId?: string | null;
  activeAiPrompt?: string | null;
  /**
   * Multi-page project state (Sprint 5). Optional so old sessions
   * saved before multi-page existed still load correctly -- absent
   * `pages` means "single page," reconstructed from the top-level
   * asset/document fields above. Stored as plain JSON-safe records
   * (id/name/asset/canvas/history/historyIndex per page) mirroring
   * frontend/lib/editor/types.ts's PageRecord shape.
   */
  pages?: Record<string, unknown>;
  pageOrder?: string[];
  activePageId?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function saveSession(session: PersistedSession): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(session, SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed."));
    });
    db.close();
  } catch {
    // Autosave is best-effort. A failure here should never interrupt editing.
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const db = await openDb();
    const result = await new Promise<PersistedSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(SESSION_KEY);
      req.onsuccess = () => resolve((req.result as PersistedSession | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed."));
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed."));
    });
    db.close();
  } catch {
    // Best-effort, same as saveSession.
  }
}

/**
 * Records that an AI job is now in flight for the CURRENT session, so
 * a refresh mid-generation can detect and check on it instead of
 * silently losing track of it. No-ops if there's no session to attach
 * to yet (asset not loaded / nothing autosaved yet) -- that's fine,
 * the next regular autosave will include it once one exists.
 */
export async function setActiveAiJob(jobId: string, prompt: string): Promise<void> {
  const existing = await loadSession();
  if (!existing) return;
  await saveSession({ ...existing, activeAiJobId: jobId, activeAiPrompt: prompt, savedAt: Date.now() });
}

/** Called once a job reaches ANY terminal state (completed or failed). */
export async function clearActiveAiJob(): Promise<void> {
  const existing = await loadSession();
  if (!existing || !existing.activeAiJobId) return;
  await saveSession({ ...existing, activeAiJobId: null, activeAiPrompt: null, savedAt: Date.now() });
}
