import { curatedVideos, mockSearchVideos } from "./seed";

const DEFAULT_ALLOWLIST = ["The Mindful Movement","Yoga With Adriene","Michael Sealey","Great Meditation","Headspace"];
const DEFAULT_BLOCKLIST = ["asmr eating","prank","conspiracy","politics","crypto","weight loss","hypnosis for"];

export function buildCurationPolicy({ channelAllowlist = DEFAULT_ALLOWLIST, keywordBlocklist = DEFAULT_BLOCKLIST } = {}) {
  const allow = new Set(channelAllowlist.map((s) => s.toLowerCase()));
  const block = keywordBlocklist.map((s) => s.toLowerCase());
  return { allow, block };
}

export function isAllowed(video, policy) {
  const title = (video.title ?? "").toLowerCase();
  const channel = (video.channelTitle ?? "").toLowerCase();
  if (policy.allow.size > 0 && !policy.allow.has(channel)) return false;
  for (const b of policy.block) if (b && title.includes(b)) return false;
  return true;
}

export function rankVideos(videos, query) {
  const q = (query ?? "").trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const score = (v) => {
    const t = (v.title ?? "").toLowerCase();
    let s = 0;
    for (const term of terms) if (t.includes(term)) s += 3;
    const d = v.durationSec ?? 0;
    if (d >= 8*60 && d <= 20*60) s += 2;
    if (d > 0 && d < 6*60) s -= 1;
    if (d > 0 && d > 45*60) s -= 1;
    return s;
  };
  return [...videos].sort((a,b) => score(b) - score(a));
}

export function durationBucket(sec) {
  if (!sec) return "Unknown";
  if (sec <= 7*60) return "Short";
  if (sec <= 20*60) return "Medium";
  return "Long";
}

export const mockProvider = {
  async curated() { return curatedVideos.map((v) => ({ ...v, source: "curated" })); },
  async search(query, { maxResults = 12 } = {}) {
    const base = mockSearchVideos(query).slice(0, maxResults);
    return base.map((v) => ({ ...v, source: "search" }));
  },
};
