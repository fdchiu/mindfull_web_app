import Dexie from "dexie";
import { defaultPresets } from "./presets.js";

let dbInstance = null;

const memoryStore = {
  sessions: [],
  presets: null,
  settings: new Map(),
  youtube: [],
};

function ensureMemoryPresets() {
  if (!memoryStore.presets || memoryStore.presets.length === 0) {
    memoryStore.presets = defaultPresets();
  }
  return memoryStore.presets;
}

function getDb() {
  if (dbInstance) return dbInstance;
  if (typeof indexedDB === "undefined") return null;
  dbInstance = new Dexie("mindful_web");
  dbInstance.version(1).stores({
    sessions: "&id, startedAt",
    presets: "&id, createdAt, updatedAt",
    kv: "&key",
  });
  dbInstance.version(2).stores({
    sessions: "&id, startedAt",
    presets: "&id, createdAt, updatedAt",
    kv: "&key",
    youtube: "&id, savedAt",
  });
  return dbInstance;
}

async function ensureDb() {
  const db = getDb();
  if (!db) return null;
  if (!db.isOpen()) await db.open();
  return db;
}

function sortByUpdated(array) {
  return array
    .slice()
    .sort(
      (a, b) =>
        (new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() || 0) -
        (new Date(a.updatedAt ?? a.createdAt ?? 0).getTime() || 0)
    );
}

async function ensurePresetSeeded(db) {
  if (db) {
    const existing = await db.presets.count();
    if (existing === 0) {
      const seeds = defaultPresets();
      await db.presets.bulkPut(seeds);
      return seeds;
    }
    return null;
  }
  const presets = ensureMemoryPresets();
  return presets;
}

export async function getSessions() {
  const db = await ensureDb();
  if (db) {
    return db.sessions.orderBy("startedAt").reverse().toArray();
  }
  return memoryStore.sessions.slice().sort((a, b) => {
    const aDate = new Date(a.startedAt ?? 0).getTime() || 0;
    const bDate = new Date(b.startedAt ?? 0).getTime() || 0;
    return bDate - aDate;
  });
}

export async function addSession(session) {
  const db = await ensureDb();
  if (db) {
    await db.sessions.put(session);
    return;
  }
  const filtered = memoryStore.sessions.filter((s) => s.id !== session.id);
  memoryStore.sessions = [session, ...filtered];
}

export async function clearSessions() {
  const db = await ensureDb();
  if (db) {
    await db.sessions.clear();
    return;
  }
  memoryStore.sessions = [];
}

export async function getPresets() {
  const db = await ensureDb();
  if (db) {
    await ensurePresetSeeded(db);
    const all = await db.presets.toArray();
    return sortByUpdated(all);
  }
  return sortByUpdated(ensureMemoryPresets());
}

export async function upsertPresets(presets) {
  const db = await ensureDb();
  if (db) {
    await db.presets.bulkPut(presets);
    return;
  }
  memoryStore.presets = presets.map((p) => ({ ...p }));
}

export async function getSetting(key, fallback = null) {
  const db = await ensureDb();
  if (db) {
    const row = await db.kv.get(key);
    return row?.value ?? fallback;
  }
  return memoryStore.settings.has(key) ? memoryStore.settings.get(key) : fallback;
}

export async function setSetting(key, value) {
  const db = await ensureDb();
  if (db) {
    await db.kv.put({ key, value });
    return value;
  }
  memoryStore.settings.set(key, value);
  return value;
}

export async function getSavedYouTube() {
  const db = await ensureDb();
  if (db) {
    return db.youtube.orderBy("savedAt").reverse().toArray();
  }
  return memoryStore.youtube.slice().sort((a, b) => {
    const aTime = new Date(a.savedAt ?? 0).getTime() || 0;
    const bTime = new Date(b.savedAt ?? 0).getTime() || 0;
    return bTime - aTime;
  });
}

export async function saveYouTubeItem(video) {
  if (!video?.id) return;
  const db = await ensureDb();
  if (db) {
    await db.youtube.put(video);
    return;
  }
  const filtered = memoryStore.youtube.filter((v) => v.id !== video.id);
  memoryStore.youtube = [{ ...video }, ...filtered];
}

export async function removeYouTubeItem(id) {
  if (!id) return;
  const db = await ensureDb();
  if (db) {
    await db.youtube.delete(id);
    return;
  }
  memoryStore.youtube = memoryStore.youtube.filter((v) => v.id !== id);
}

export async function exportAll() {
  const db = await ensureDb();
  if (db) {
    const [sessions, presets, kvPairs, youtube] = await Promise.all([
      db.sessions.toArray(),
      db.presets.toArray(),
      db.kv.toArray(),
      db.youtube.toArray(),
    ]);
    return {
      sessions,
      presets,
      settings: Object.fromEntries(kvPairs.map(({ key, value }) => [key, value])),
      youtube,
    };
  }
  return {
    sessions: memoryStore.sessions.slice(),
    presets: ensureMemoryPresets().slice(),
    settings: Object.fromEntries(memoryStore.settings.entries()),
    youtube: memoryStore.youtube.slice(),
  };
}

export async function importAll(payload, { mode = "merge" } = {}) {
  const data = payload ?? {};
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const presets = Array.isArray(data.presets) ? data.presets : [];
  const settings = typeof data.settings === "object" && data.settings ? data.settings : {};
  const youtube = Array.isArray(data.youtube) ? data.youtube : [];

  const db = await ensureDb();
  if (db) {
    if (mode === "replace") {
      await Promise.all([db.sessions.clear(), db.presets.clear(), db.kv.clear(), db.youtube.clear()]);
    }
    if (sessions.length) await db.sessions.bulkPut(sessions);
    if (presets.length) await db.presets.bulkPut(presets);
    if (youtube.length) await db.youtube.bulkPut(youtube);
    await Promise.all(
      Object.entries(settings).map(([key, value]) => db.kv.put({ key, value }))
    );
    await ensurePresetSeeded(db);
    return;
  }

  if (mode === "replace") {
    memoryStore.sessions = [];
    memoryStore.presets = null;
    memoryStore.settings.clear();
    memoryStore.youtube = [];
  }
  sessions.forEach((session) => {
    const existingIndex = memoryStore.sessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      memoryStore.sessions[existingIndex] = session;
    } else {
      memoryStore.sessions.push(session);
    }
  });
  if (presets.length) {
    memoryStore.presets = sortByUpdated(presets);
  } else {
    ensureMemoryPresets();
  }
  Object.entries(settings).forEach(([key, value]) => memoryStore.settings.set(key, value));
  if (youtube.length) {
    memoryStore.youtube = youtube.map((v) => ({ ...v }));
  }
}
