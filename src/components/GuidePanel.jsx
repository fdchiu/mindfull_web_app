import React from "react";
import { GUIDES } from "../guides/guides";

export default function GuidePanel({
  guideId,
  setGuideId,
  ttsEnabled,
  setTtsEnabled,
  voiceURI,
  setVoiceURI,
  voices,
}) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white/90">Guided</div>
          <div className="text-xs text-white/60">Timed cues with optional voice.</div>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
          <input
            type="checkbox"
            className="accent-white"
            checked={ttsEnabled}
            onChange={(e) => setTtsEnabled(e.target.checked)}
          />
          TTS
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <label className="text-xs text-white/60">Guide</label>
        <select
          className="w-full rounded-xl bg-black/30 border border-white/10 p-2 text-sm"
          value={guideId}
          onChange={(e) => setGuideId(e.target.value)}
        >
          {GUIDES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title} • {Math.round(g.durationSec / 60)} min
            </option>
          ))}
        </select>

        <div className="rounded-2xl border border-white/10 bg-black/10 p-3 mt-2">
          <div className="text-xs text-white/60">Voice</div>
          <select
            className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 p-2 text-sm"
            value={voiceURI ?? ""}
            onChange={(e) => setVoiceURI(e.target.value || null)}
            disabled={!ttsEnabled}
            title={!ttsEnabled ? "Enable TTS to choose a voice" : ""}
          >
            <option value="">Default</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>

          <div className="text-xs text-white/50 mt-2">Some browsers load voices after a moment.</div>
        </div>
      </div>
    </div>
  );
}
