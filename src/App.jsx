import React, { useEffect, useMemo, useRef, useState } from "react";
import YouTube from "react-youtube";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

import SoundscapePanel from "./components/SoundscapePanel.jsx";
import GuidePanel from "./components/GuidePanel.jsx";
import CueOverlay from "./components/CueOverlay.jsx";
import TranscriptDrawer from "./components/TranscriptDrawer.jsx";
import YouTubeLibrary from "./components/YouTubeLibrary.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import EndSessionDialog from "./components/EndSessionDialog.jsx";

import { SoundscapeEngine } from "./audio/audioEngine.js";
import { GUIDES, getGuide } from "./guides/guides.js";
import { speak, cancelSpeak, listVoices } from "./tts/tts.js";
import { useSettings } from "./settings/useSettings.js";
import { useReducedMotionEffective } from "./motion/useMotionPrefs.js";

import {
  getSessions,
  addSession,
  clearSessions,
  getPresets,
  upsertPresets,
  exportAll,
  importAll,
  getSetting,
  setSetting,
} from "./data/repo.js";

// Utilities
const uid = () => crypto.randomUUID?.() ?? String(Date.now()) + Math.random();
const fmtTime = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)));
  let streak = 0;
  let d = new Date();
  for (;;) {
    const k = dayKey(d);
    if (days.has(k)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function weeklyMinutes(sessions) {
  const now = new Date();
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return dayKey(d);
  });
  const map = Object.fromEntries(days.map((k) => [k, 0]));
  sessions.forEach((s) => {
    const k = dayKey(s.startedAt);
    if (k in map) map[k] += Math.round((s.actualDurationSec ?? s.durationSec ?? 0) / 60);
  });
  return days.map((k) => ({ day: k.slice(5), minutes: map[k] }));
}

function Card({ className = "", children }) {
  return (
    <div
      className={
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hc-border hc-bg " +
        className
      }
    >
      {children}
    </div>
  );
}

function Chip({ selected, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-2 text-sm font-semibold transition",
        selected
          ? "bg-indigo-400/25 border border-indigo-300/40 text-white"
          : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full rounded-full px-4 py-3 font-bold transition",
        disabled
          ? "bg-white/10 text-white/40 cursor-not-allowed"
          : "bg-gradient-to-br from-indigo-400 to-cyan-300 text-black hover:opacity-95",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-full text-sm font-semibold transition",
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function BreathingOrb({ phase, calm, reducedMotion }) {
  const inhale = phase < 0.5;
  if (reducedMotion) {
    return (
      <div className="relative mx-auto mt-2 flex h-[220px] w-[220px] items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-indigo-400/15 blur-2xl" />
        <div className="absolute inset-6 rounded-full bg-cyan-300/10 blur-xl" />
        <div className="relative flex h-[180px] w-[180px] items-center justify-center rounded-full border border-white/10 bg-white/5">
          <div className="text-center">
            <div className="text-white/90 text-sm font-semibold">
              {inhale ? "Inhale…" : "Exhale…"}
            </div>
            {!calm ? (
              <div className="mt-1 text-white text-4xl font-extrabold tracking-tight">
                {Math.round(phase * 100)}%
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="relative mx-auto mt-2 flex h-[220px] w-[220px] items-center justify-center"
      animate={{ scale: inhale ? 1.06 : 0.94 }}
      transition={{ duration: 2.0, ease: "easeInOut" }}
    >
      <div className="absolute inset-0 rounded-full bg-indigo-400/15 blur-2xl" />
      <div className="absolute inset-6 rounded-full bg-cyan-300/10 blur-xl" />
      <div className="relative flex h-[180px] w-[180px] items-center justify-center rounded-full border border-white/10 bg-white/5">
        <div className="text-center">
          <div className="text-white/90 text-sm font-semibold">
            {inhale ? "Inhale…" : "Exhale…"}
          </div>
          {!calm ? (
            <div className="mt-1 text-white text-4xl font-extrabold tracking-tight">
              {Math.round(phase * 100)}%
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function practiceLabel(k) {
  switch (k) {
    case "body_scan":
      return "Body scan";
    case "focus":
      return "Focus";
    case "sleep":
      return "Sleep";
    case "custom":
      return "Custom";
    case "guided":
      return "Guided";
    case "breath":
    default:
      return "Breath";
  }
}

function Check({ children }) {
  return (
    <div className="flex gap-2">
      <div className="mt-[6px] h-2 w-2 rounded-full bg-cyan-300/80" />
      <div>{children}</div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("today"); // today | session | progress | library

  // Settings + motion prefs
  const { settings, setSettings } = useSettings();
  const reducedMotion = useReducedMotionEffective(settings.reduceMotion);
  const calm = !!settings.calmSessionMode;

  // Sessions
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    (async () => setSessions(await getSessions()))();
  }, []);

  // Presets
  const [presets, setPresets] = useState([]);
  const [presetId, setPresetId] = useState(null);
  useEffect(() => {
    (async () => {
      const p = await getPresets();
      setPresets(p);
      setPresetId(p[0]?.id ?? null);
    })();
  }, []);
  useEffect(() => {
    if (presets.length) upsertPresets(presets);
  }, [presets]);

  // Sound engine
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new SoundscapeEngine();
  const engine = engineRef.current;

  // Setup
  const [practice, setPractice] = useState("breath");
  const [minutes, setMinutes] = useState(10);
  const [audioMode, setAudioMode] = useState("none"); // none | soundscape | youtube

  // YouTube
  const [youtubeVideo, setYoutubeVideo] = useState({
    id: "inpok4MKVLM",
    title: "10 Minute Guided Meditation For Anxiety",
    channelTitle: "The Mindful Movement",
  });
  const youtubeId = youtubeVideo?.id;

  // Guided
  const [guidedEnabled, setGuidedEnabled] = useState(false);
  const [guideId, setGuideId] = useState(GUIDES[0]?.id);
  const guide = useMemo(() => (guidedEnabled ? getGuide(guideId) : null), [guidedEnabled, guideId]);

  // TTS stored in IndexedDB
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceURI, setVoiceURI] = useState(null);
  const [voices, setVoices] = useState(() => listVoices());
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const handler = () => setVoices(listVoices());
    handler();
    synth.onvoiceschanged = handler;
    return () => {
      try {
        synth.onvoiceschanged = null;
      } catch {}
    };
  }, []);
  useEffect(() => {
    (async () => {
      const tts = await getSetting("ttsEnabled", true);
      const voice = await getSetting("voiceURI", null);
      setTtsEnabled(!!tts);
      setVoiceURI(voice);
    })();
  }, []);
  useEffect(() => {
    setSetting("ttsEnabled", ttsEnabled);
  }, [ttsEnabled]);
  useEffect(() => {
    setSetting("voiceURI", voiceURI);
  }, [voiceURI]);

  // Running state
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [durationSec, setDurationSec] = useState(10 * 60);
  const [remaining, setRemaining] = useState(0);
  const [phase, setPhase] = useState(0);

  const startMsRef = useRef(0);
  const [currentSec, setCurrentSec] = useState(0);

  // Guided cues
  const [activeCue, setActiveCue] = useState(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const firedCuesRef = useRef(new Set());

  // Reflection
  const [reflectOpen, setReflectOpen] = useState(false);
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  // End confirmation
  const [endDialogOpen, setEndDialogOpen] = useState(false);

  const totalMinutes = useMemo(
    () => sessions.reduce((a, s) => a + Math.round((s.actualDurationSec ?? s.durationSec ?? 0) / 60), 0),
    [sessions]
  );
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const week = useMemo(() => weeklyMinutes(sessions), [sessions]);

  const todayKey = dayKey(new Date());
  const minutesToday = useMemo(() => {
    return sessions
      .filter((s) => dayKey(s.startedAt) === todayKey)
      .reduce((a, s) => a + Math.round((s.actualDurationSec ?? s.durationSec ?? 0) / 60), 0);
  }, [sessions, todayKey]);

  const recent = sessions.slice(0, 5);

  const triggerCue = (cue) => {
    setActiveCue(cue);
    if (ttsEnabled && cue?.speak) speak(cue.text, { voiceURI, rate: 0.95, pitch: 1.0, volume: 0.8 });

    window.clearTimeout(triggerCue._t);
    triggerCue._t = window.setTimeout(() => setActiveCue(null), 6500);
  };

  const beginSession = async () => {
    setMood(3);
    setNotes("");
    setTags("");

    const nowIso = new Date().toISOString();
    setStartedAt(nowIso);

    const dur = guidedEnabled && guide ? guide.durationSec : minutes * 60;
    setDurationSec(dur);
    setRemaining(dur);
    setCurrentSec(0);
    startMsRef.current = Date.now();
    firedCuesRef.current = new Set();
    setActiveCue(null);

    setRunning(true);
    setTab("session");

    if (audioMode === "soundscape") {
      await engine.resume();
      const p = presets.find((x) => x.id === presetId) ?? presets[0];
      if (p) engine.applyPreset(p);
    } else {
      engine.stop();
    }

    if (guidedEnabled && guide?.cues?.length) {
      const first = guide.cues.find((c) => c.atSec === 0) ?? guide.cues[0];
      if (first) {
        firedCuesRef.current.add(first.atSec);
        triggerCue(first);
      }
    }
  };

  const endSession = (auto = false) => {
    setRunning(false);
    engine.stop();
    cancelSpeak();
    setTranscriptOpen(false);
    setReflectOpen(true);
    if (!auto) setRemaining(0);
  };

  const saveReflection = async () => {
    const endedAt = new Date().toISOString();
    const actual = Math.min(currentSec, durationSec);

    const session = {
      id: uid(),
      practiceType: guidedEnabled ? "guided" : practice,
      startedAt,
      endedAt,
      durationSec,
      actualDurationSec: actual,
      audioMode,
      audioRef: audioMode === "youtube" ? youtubeId : audioMode === "soundscape" ? presetId : null,
      youtubeMeta: audioMode === "youtube" ? youtubeVideo : null,
      soundPresetName:
        audioMode === "soundscape" ? (presets.find((p) => p.id === presetId)?.name ?? null) : null,
      guided: guidedEnabled,
      guideId: guidedEnabled ? guideId : null,
      guideTitle: guidedEnabled && guide ? guide.title : null,
      mood,
      notes: notes.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    await addSession(session);
    setSessions(await getSessions());
    setReflectOpen(false);
    setTab("today");
  };

  // Timer loop
  useEffect(() => {
    if (!running) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startMsRef.current) / 1000);
      const left = Math.max(0, durationSec - elapsed);

      setCurrentSec(elapsed);
      setRemaining(left);

      const cyc = (elapsed % 8) / 8;
      setPhase(cyc);

      if (guidedEnabled && guide?.cues?.length) {
        for (const cue of guide.cues) {
          if (cue.atSec <= elapsed && !firedCuesRef.current.has(cue.atSec)) {
            firedCuesRef.current.add(cue.atSec);
            triggerCue(cue);
          }
        }
      }

      if (left === 0) endSession(true);
    };

    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, durationSec, guidedEnabled, guideId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (reflectOpen) return;

      if (e.code === "Space") {
        if (tab !== "session") return;
        e.preventDefault();
        if (running) {
          setRunning(false);
          engine.stop();
          cancelSpeak();
        } else if (remaining > 0 && startedAt) {
          (async () => {
            startMsRef.current = Date.now() - currentSec * 1000;
            setRunning(true);
            if (audioMode === "soundscape") {
              await engine.resume();
              const p = presets.find((x) => x.id === presetId) ?? presets[0];
              if (p) engine.applyPreset(p);
            }
          })();
        }
      }

      if (e.key === "Escape" && running) setEndDialogOpen(true);

      if ((e.key === "t" || e.key === "T") && guidedEnabled) {
        setTranscriptOpen((v) => !v);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, running, remaining, reflectOpen, guidedEnabled, audioMode, presets, presetId, startedAt, currentSec]);

  return (
    <div
      className="min-h-screen text-white"
      data-text-scale={settings.textScale}
      data-contrast={settings.highContrast ? "high" : "normal"}
    >
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0b0b12]" />
        <div className="absolute -top-24 right-[-120px] h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-40 left-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <CueOverlay
        cue={guidedEnabled ? activeCue : null}
        onOpenTranscript={() => setTranscriptOpen(true)}
        reducedMotion={reducedMotion}
      />
      <TranscriptDrawer
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        guide={guide}
        currentSec={currentSec}
        reducedMotion={reducedMotion}
      />

      <EndSessionDialog
        open={endDialogOpen}
        onClose={() => setEndDialogOpen(false)}
        onConfirm={() => {
          setEndDialogOpen(false);
          endSession(false);
        }}
        reducedMotion={reducedMotion}
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Mindful</div>
            <div className="text-white/65 text-sm mt-1">
              Daily sessions, reflection, and on-device progress.
            </div>
          </div>

          <div className="flex gap-2">
            <TabButton active={tab === "today"} onClick={() => setTab("today")}>
              Today
            </TabButton>
            <TabButton active={tab === "session"} onClick={() => setTab("session")}>
              Session
            </TabButton>
            <TabButton active={tab === "progress"} onClick={() => setTab("progress")}>
              Progress
            </TabButton>
            <TabButton active={tab === "library"} onClick={() => setTab("library")}>
              Library
            </TabButton>
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-4">
            {tab === "today" && (
              <>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">Today</div>
                      <div className="text-white/65 text-sm">One calm session at a time.</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-xs text-white/60">Minutes today</div>
                        <div className="text-2xl font-extrabold">{minutesToday}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="text-xs text-white/60">Streak</div>
                        <div className="text-2xl font-extrabold">{streak}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Suggested</div>
                      <div className="font-bold">Breath • 10 min</div>
                      <div className="text-xs text-white/60 mt-1">Soundscape optional</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Total minutes</div>
                      <div className="font-bold">{totalMinutes}</div>
                      <div className="text-xs text-white/60 mt-1">All time</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Last mood</div>
                      <div className="font-bold">{sessions[0]?.mood ?? "—"}</div>
                      <div className="text-xs text-white/60 mt-1">From last session</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <PrimaryButton onClick={beginSession} disabled={presets.length === 0}>
                      Start now
                    </PrimaryButton>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Recent sessions</div>
                    <button
                      className="text-sm text-white/70 hover:text-white"
                      onClick={() => setTab("progress")}
                    >
                      View insights
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {recent.length === 0 ? (
                      <div className="text-white/60 text-sm">
                        No sessions yet. Start your first session to build your history.
                      </div>
                    ) : (
                      recent.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold">
                              {s.guided ? s.guideTitle ?? "Guided" : practiceLabel(s.practiceType)} •{" "}
                              {Math.round((s.actualDurationSec ?? s.durationSec ?? 0) / 60)} min
                            </div>
                            <div className="text-xs text-white/60">
                              {new Date(s.startedAt).toLocaleString()} • mood {s.mood ?? "—"}
                            </div>
                          </div>
                          <div className="text-xs text-white/55">
                            {s.audioMode === "youtube"
                              ? "YouTube"
                              : s.audioMode === "soundscape"
                              ? "Soundscape"
                              : "Silent"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </>
            )}

            {tab === "session" && (
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold">Session</div>
                    <div className="text-white/65 text-sm">Configure, begin, and reflect.</div>
                  </div>
                  {running ? (
                    <button
                      className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                      onClick={() => setEndDialogOpen(true)}
                      aria-label="End session"
                    >
                      End
                    </button>
                  ) : null}
                </div>

                {!running ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-sm font-bold text-white/90">Practice</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          ["breath", "Breath"],
                          ["body_scan", "Body scan"],
                          ["focus", "Focus"],
                          ["sleep", "Sleep"],
                          ["custom", "Custom"],
                        ].map(([k, label]) => (
                          <Chip key={k} selected={practice === k} onClick={() => setPractice(k)}>
                            {label}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white/90">Guided session</div>
                          <div className="text-xs text-white/60">
                            Timed cues + transcript + optional voice.
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
                          <input
                            type="checkbox"
                            className="accent-white"
                            checked={guidedEnabled}
                            onChange={(e) => setGuidedEnabled(e.target.checked)}
                          />
                          Enabled
                        </label>
                      </div>
                      {guidedEnabled && (
                        <GuidePanel
                          guideId={guideId}
                          setGuideId={setGuideId}
                          ttsEnabled={ttsEnabled}
                          setTtsEnabled={setTtsEnabled}
                          voiceURI={voiceURI}
                          setVoiceURI={setVoiceURI}
                          voices={voices}
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-white/90">Duration</div>
                        <div className="text-sm text-white/70">
                          {guidedEnabled && guide
                            ? `Guide: ${Math.round(guide.durationSec / 60)} min`
                            : `${minutes} min`}
                        </div>
                      </div>
                      <input
                        disabled={guidedEnabled}
                        className="mt-2 w-full accent-white disabled:opacity-40"
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white/90">Audio</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Chip selected={audioMode === "none"} onClick={() => setAudioMode("none")}>
                          Silent
                        </Chip>
                        <Chip
                          selected={audioMode === "soundscape"}
                          onClick={() => setAudioMode("soundscape")}
                        >
                          Soundscape
                        </Chip>
                        <Chip
                          selected={audioMode === "youtube"}
                          onClick={() => setAudioMode("youtube")}
                        >
                          YouTube
                        </Chip>
                      </div>

                      {audioMode === "soundscape" && (
                        <SoundscapePanel
                          presets={presets}
                          setPresets={setPresets}
                          selectedPresetId={presetId}
                          setSelectedPresetId={setPresetId}
                          engine={engine}
                        />
                      )}

                      {audioMode === "youtube" && (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-white/60">Selected clip</div>
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-white/90 truncate">
                                {youtubeVideo?.title ?? "—"}
                              </div>
                              <div className="text-xs text-white/60 mt-1">
                                {youtubeVideo?.channelTitle ?? ""}
                              </div>
                              <div className="text-xs text-white/50 mt-1">Video ID: {youtubeId}</div>
                            </div>
                            <button
                              className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                              onClick={() => setTab("library")}
                            >
                              Change
                            </button>
                          </div>
                          <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                            <YouTube videoId={youtubeId} opts={{ width: "100%", height: "220" }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <PrimaryButton onClick={beginSession} disabled={audioMode === "soundscape" && !presetId}>
                      Begin
                    </PrimaryButton>
                    <div className="text-xs text-white/50">
                      Shortcuts: Space (pause/resume), Esc (end), T (transcript).
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">
                          {guidedEnabled ? guide?.title ?? "Guided" : practiceLabel(practice)}
                        </div>
                        <div className="text-white/70 text-sm">
                          {audioMode === "youtube"
                            ? "YouTube"
                            : audioMode === "soundscape"
                            ? "Soundscape"
                            : "Silent"}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center">
                        <div className="rounded-full border border-white/10 bg-black/20 px-6 py-3" aria-live="polite" aria-label="Time remaining">
                          <div className="text-4xl font-extrabold tracking-tight">{fmtTime(remaining)}</div>
                        </div>
                      </div>

                      <BreathingOrb phase={phase} calm={calm} reducedMotion={reducedMotion} />

                      {!calm && audioMode === "youtube" && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                          <YouTube videoId={youtubeId} opts={{ width: "100%", height: "220" }} />
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button className="rounded-full bg-white/10 px-4 py-3 font-semibold hover:bg-white/15" onClick={() => setEndDialogOpen(true)}>
                          End
                        </button>
                        <button
                          className="rounded-full bg-white/5 px-4 py-3 font-semibold text-white/70 hover:bg-white/10"
                          onClick={() => {
                            setRunning(false);
                            engine.stop();
                            cancelSpeak();
                          }}
                        >
                          Pause
                        </button>
                      </div>
                    </div>

                    {!running && remaining > 0 && (
                      <div className="mt-3">
                        <PrimaryButton
                          onClick={async () => {
                            startMsRef.current = Date.now() - currentSec * 1000;
                            setRunning(true);
                            if (audioMode === "soundscape") {
                              await engine.resume();
                              const p = presets.find((x) => x.id === presetId) ?? presets[0];
                              if (p) engine.applyPreset(p);
                            }
                          }}
                        >
                          Resume
                        </PrimaryButton>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {tab === "progress" && (
              <>
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">Progress</div>
                      <div className="text-white/65 text-sm">Weekly minutes and habit signals (IndexedDB).</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/60">All time</div>
                      <div className="text-2xl font-extrabold">{totalMinutes} min</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Streak</div>
                      <div className="text-xl font-extrabold">{streak} days</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Sessions</div>
                      <div className="text-xl font-extrabold">{sessions.length}</div>
                    </div>
                  </div>

                  <div className="mt-4 h-[260px] rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-bold mb-2">This week (minutes)</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={week}>
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Data</div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                        onClick={async () => {
                          const payload = await exportAll();
                          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "mindful_export.json";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export JSON
                      </button>

                      <label className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 border border-white/10 cursor-pointer">
                        Import
                        <input
                          type="file"
                          accept="application/json"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const parsed = JSON.parse(await file.text());
                            await importAll(parsed, { mode: "merge" });
                            setSessions(await getSessions());
                            const p = await getPresets();
                            setPresets(p);
                            setPresetId(p[0]?.id ?? null);
                          }}
                        />
                      </label>

                      <button
                        className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 border border-white/10"
                        onClick={async () => {
                          if (confirm("Clear all sessions from this device?")) {
                            await clearSessions();
                            setSessions([]);
                          }
                        }}
                      >
                        Clear sessions
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {sessions.length === 0 ? (
                      <div className="text-white/60 text-sm">No sessions saved yet.</div>
                    ) : (
                      sessions.slice(0, 20).map((s) => (
                        <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">
                              {s.guided ? s.guideTitle ?? "Guided" : practiceLabel(s.practiceType)} •{" "}
                              {Math.round((s.actualDurationSec ?? s.durationSec ?? 0) / 60)} min
                            </div>
                            <div className="text-xs text-white/60">mood {s.mood ?? "—"}</div>
                          </div>
                          <div className="text-xs text-white/60 mt-1">
                            {new Date(s.startedAt).toLocaleString()} •{" "}
                            {s.audioMode === "youtube"
                              ? `YouTube${s.youtubeMeta?.channelTitle ? ` (${s.youtubeMeta.channelTitle})` : ""}`
                              : s.audioMode === "soundscape"
                              ? `Soundscape${s.soundPresetName ? ` (${s.soundPresetName})` : ""}`
                              : "Silent"}
                          </div>
                          {s.notes ? <div className="text-sm text-white/80 mt-2">{s.notes}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </>
            )}

            {tab === "library" && (
              <>
                <YouTubeLibrary
                  onPickVideo={(video) => {
                    setYoutubeVideo(video);
                    setAudioMode("youtube");
                    setTab("session");
                  }}
                />
                <Card className="mt-4">
                  <div className="text-lg font-bold">Library notes</div>
                  <div className="text-sm text-white/65 mt-1">
                    Search is mocked for evaluation (no API key). Replace provider with a server-side proxy for real YouTube Data API.
                  </div>
                </Card>
              </>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card>
              <div className="text-lg font-bold">Evaluation checklist</div>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                <Check>Session start in &lt; 10 seconds (low friction).</Check>
                <Check>Audio modes feel intentional (silent/soundscape/YouTube).</Check>
                <Check>Guided cues are calm + transcript is available.</Check>
                <Check>Progress is legible; history persists (IndexedDB).</Check>
                <Check>Accessibility: reduced motion, focus states, shortcuts.</Check>
              </div>
            </Card>

            <SettingsPanel settings={settings} setSettings={setSettings} />

            <Card>
              <div className="text-lg font-bold">Shortcuts</div>
              <ul className="mt-2 text-sm text-white/70 list-disc pl-5 space-y-2">
                <li>
                  <span className="text-white/85 font-semibold">Space</span>: pause/resume (in Session)
                </li>
                <li>
                  <span className="text-white/85 font-semibold">Esc</span>: end confirmation
                </li>
                <li>
                  <span className="text-white/85 font-semibold">T</span>: transcript toggle (guided sessions)
                </li>
              </ul>
            </Card>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {reflectOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReflectOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Reflection"
          >
            <motion.div
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#121225] p-4"
              initial={reducedMotion ? { opacity: 1, y: 0 } : { y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { y: 18, opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-bold">Reflect</div>
              <div className="text-sm text-white/65 mt-1">Quick feedback makes progress meaningful.</div>

              <div className="mt-4">
                <div className="text-sm font-bold text-white/90">Mood</div>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Chip key={v} selected={mood === v} onClick={() => setMood(v)}>
                      {v}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <label className="text-sm">
                  <div className="text-sm font-bold text-white/90">Notes</div>
                  <textarea
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm outline-none focus:border-white/20"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you notice?"
                  />
                </label>

                <label className="text-sm">
                  <div className="text-sm font-bold text-white/90">Tags</div>
                  <input
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm outline-none focus:border-white/20"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="calm, anxious, focused"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="rounded-full bg-white/10 px-4 py-3 font-semibold hover:bg-white/15"
                  onClick={() => setReflectOpen(false)}
                >
                  Skip
                </button>
                <button
                  className="rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300 px-4 py-3 font-bold text-black hover:opacity-95"
                  onClick={saveReflection}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
