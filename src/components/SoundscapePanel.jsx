import React, { useMemo, useState } from "react";
import { newPresetFrom } from "../data/presets";

export default function SoundscapePanel({ presets, setPresets, selectedPresetId, setSelectedPresetId, engine }) {
  const selected = useMemo(() => presets.find((p) => p.id === selectedPresetId) ?? presets[0], [presets, selectedPresetId]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const updateSelected = (patch) => {
    if (!selected) return;
    setPresets((prev) => {
      const next = prev.map((p) => {
        if (p.id !== selected.id) return p;
        return { ...p, ...patch, layers: patch.layers ? patch.layers : p.layers, updatedAt: new Date().toISOString(), isBuiltIn: false };
      });
      const updated = next.find((p) => p.id === selected.id);
      if (updated) engine?.applyPreset(updated);
      return next;
    });
  };

  const setLayer = (key, patch) => {
    const layers = { ...selected.layers, [key]: { ...(selected.layers[key] ?? {}), ...patch } };
    updateSelected({ layers });
  };

  const duplicate = () => {
    if (!selected) return;
    const copy = newPresetFrom(selected, `${selected.name} Copy`);
    setPresets((prev) => [copy, ...prev]);
    setSelectedPresetId(copy.id);
  };

  const remove = () => {
    if (!selected || selected.isBuiltIn) return;
    setPresets((prev) => prev.filter((p) => p.id !== selected.id));
    setSelectedPresetId(presets[0]?.id);
  };

  if (!selected) return null;

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white/90">Soundscape</div>
          <div className="text-xs text-white/60">Presets apply live (after a user gesture).</div>
        </div>
        <button className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15" onClick={() => setAdvancedOpen((v) => !v)}>
          {advancedOpen ? "Hide" : "Customize"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <label className="text-xs text-white/60">Preset</label>
        <select
          className="w-full rounded-xl bg-black/30 border border-white/10 p-2 text-sm"
          value={selectedPresetId ?? selected.id}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedPresetId(id);
            const p = presets.find((x) => x.id === id);
            if (p) engine?.applyPreset(p);
          }}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.isBuiltIn ? " • Built-in" : ""}
            </option>
          ))}
        </select>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15" onClick={duplicate}>Duplicate</button>
          <button
            className={[
              "rounded-full px-3 py-2 text-sm font-semibold",
              selected.isBuiltIn ? "bg-white/5 text-white/40 cursor-not-allowed" : "bg-white/5 text-white/70 hover:bg-white/10",
            ].join(" ")}
            onClick={remove}
            disabled={selected.isBuiltIn}
            title={selected.isBuiltIn ? "Built-in presets can’t be deleted." : "Delete preset"}
          >
            Delete
          </button>
        </div>
      </div>

      {advancedOpen && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
          <div className="text-xs text-white/60 mb-2">Mixer</div>

          <Slider label="Master" value={selected.layers.master?.vol ?? 0.55} min={0} max={1} step={0.01} onChange={(v) => setLayer("master", { vol: v })} />
          <Slider label="Pink noise" value={selected.layers.pink?.vol ?? 0.35} min={0} max={1} step={0.01} onChange={(v) => setLayer("pink", { vol: v })} />
          <Slider label="White noise" value={selected.layers.white?.vol ?? 0.0} min={0} max={1} step={0.01} onChange={(v) => setLayer("white", { vol: v })} />
          <Slider label="Tone" value={selected.layers.tone?.vol ?? 0.12} min={0} max={0.8} step={0.01} onChange={(v) => setLayer("tone", { vol: v })} />
          <Slider label="Tone Hz" value={selected.layers.tone?.hz ?? 144} min={60} max={320} step={1} format={(v) => `${Math.round(v)} Hz`} onChange={(v) => setLayer("tone", { hz: v })} />

          <div className="mt-3">
            <label className="text-xs text-white/60">Preset name</label>
            <input className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 p-2 text-sm outline-none focus:border-white/20" value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, format }) {
  const v = Number(value);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white/85">{label}</div>
        <div className="text-xs text-white/60">{format ? format(v) : v.toFixed(2)}</div>
      </div>
      <input className="w-full accent-white" type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
