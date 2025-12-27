import React, { useEffect, useMemo, useState } from "react";
import { mockProvider, buildCurationPolicy, isAllowed, rankVideos, durationBucket } from "../youtube/provider";
import { getSavedYouTube, saveYouTubeItem, removeYouTubeItem } from "../data/repo.js";

export default function YouTubeLibrary({ onPickVideo }) {
  const [tab, setTab] = useState("curated");
  const [query, setQuery] = useState("");
  const [durFilter, setDurFilter] = useState("Any");
  const [saved, setSaved] = useState([]);
  const [curated, setCurated] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const policy = useMemo(() => buildCurationPolicy(), []);

  useEffect(() => { (async () => setSaved(await getSavedYouTube()))(); }, []);
  const savedSet = useMemo(() => new Set(saved.map((x) => x.id)), [saved]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const vids = await mockProvider.curated();
      setCurated(vids.filter((v) => isAllowed(v, policy)));
      setLoading(false);
    })();
  }, [policy]);

  const runSearch = async () => {
    setLoading(true);
    const vids = await mockProvider.search(query, { maxResults: 24 });
    const filtered = vids
      .filter((v) => isAllowed(v, policy))
      .filter((v) => (durFilter === "Any" ? true : durationBucket(v.durationSec) === durFilter));
    setResults(rankVideos(filtered, query));
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== "search") return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, durFilter]);

  const toggleSave = async (video) => {
    if (savedSet.has(video.id)) await removeYouTubeItem(video.id);
    else await saveYouTubeItem({ ...video, savedAt: new Date().toISOString() });
    setSaved(await getSavedYouTube());
  };

  const list = tab === "curated" ? curated : tab === "search" ? results : saved;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hc-border hc-bg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold">YouTube</div>
          <div className="text-sm text-white/65 mt-1">Curated, searchable, and saved clips for sessions.</div>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "curated"} onClick={() => setTab("curated")}>Curated</TabButton>
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>Search</TabButton>
          <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>Saved</TabButton>
        </div>
      </div>

      {tab === "search" && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-white/60">Search</label>
            <input className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm outline-none focus:border-white/20"
              value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., anxiety, sleep, focus"
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} />
          </div>
          <div>
            <label className="text-xs text-white/60">Duration</label>
            <select className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm"
              value={durFilter} onChange={(e) => setDurFilter(e.target.value)}>
              {["Any","Short","Medium","Long"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button className="rounded-full bg-white/10 px-4 py-3 font-semibold hover:bg-white/15" onClick={runSearch}>Search</button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {tab === "saved" && saved.length === 0 ? (
              <div className="text-sm text-white/60">No saved clips yet. Save from Curated or Search.</div>
            ) : (
              list.map((v) => (
                <VideoRow key={v.id} video={v} saved={savedSet.has(v.id)} onSave={() => toggleSave(v)} onPick={() => onPickVideo?.(v)} />
              ))
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-white/50 mt-4">Curation policy: channel allowlist + keyword blocklist. Swap to real API later via provider interface.</div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button onClick={onClick} className={["px-3 py-2 rounded-full text-sm font-semibold transition", active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"].join(" ")}>
      {children}
    </button>
  );
}

function VideoRow({ video, saved, onSave, onPick }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
      <div className="h-16 w-28 overflow-hidden rounded-xl border border-white/10 bg-black/20 flex-shrink-0">
        {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white/90 truncate">{video.title}</div>
        <div className="text-xs text-white/60 mt-1">{video.channelTitle ?? "—"} • {bucketLabel(video.durationSec)}</div>
        <div className="text-xs text-white/50 mt-1">Video ID: {video.id}</div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15" onClick={onPick}>Use</button>
        <button className={["rounded-full px-3 py-2 text-sm font-semibold border", saved ? "bg-cyan-300/20 text-white border-cyan-300/20" : "bg-white/5 text-white/70 hover:bg-white/10 border-white/10"].join(" ")} onClick={onSave}>
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function bucketLabel(sec) {
  if (!sec) return "Duration unknown";
  const m = Math.round(sec / 60);
  return `${m} min`;
}
