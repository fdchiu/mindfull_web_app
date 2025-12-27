import Dexie from "dexie";

// Schema versions:
// v1: sessions
// v2: soundPresets, youtubeSaved
// v3: settings
export const db = new Dexie("mindful_db");

db.version(1).stores({
  sessions: "id, startedAt, endedAt, practiceType, audioMode",
});

db.version(2).stores({
  sessions: "id, startedAt, endedAt, practiceType, audioMode",
  soundPresets: "id, name, updatedAt",
  youtubeSaved: "id, savedAt, channelTitle",
});

db.version(3).stores({
  sessions: "id, startedAt, endedAt, practiceType, audioMode",
  soundPresets: "id, name, updatedAt",
  youtubeSaved: "id, savedAt, channelTitle",
  settings: "key",
});
