import React from "react";

export default function SettingsPanel({ settings, setSettings }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hc-border hc-bg">
      <div className="text-lg font-bold">Settings</div>
      <div className="text-sm text-white/65 mt-1">Accessibility and calm preferences.</div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="text-sm font-bold text-white/90">Reduce motion</div>
          <div className="text-xs text-white/60 mt-1">Respects system setting by default.</div>
          <select
            className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm"
            value={settings.reduceMotion}
            onChange={(e) => setSettings({ reduceMotion: e.target.value })}
          >
            <option value="system">System</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white/90">High contrast</div>
            <div className="text-xs text-white/60 mt-1">Sharper borders and backgrounds.</div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <input
              type="checkbox"
              className="accent-white"
              checked={settings.highContrast}
              onChange={(e) => setSettings({ highContrast: e.target.checked })}
            />
            Enabled
          </label>
        </div>

        <div>
          <div className="text-sm font-bold text-white/90">Text size</div>
          <div className="text-xs text-white/60 mt-1">Adjust base font scaling.</div>
          <select
            className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 p-3 text-sm"
            value={settings.textScale}
            onChange={(e) => setSettings({ textScale: e.target.value })}
          >
            <option value="small">Small</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white/90">Calm session mode</div>
            <div className="text-xs text-white/60 mt-1">
              Minimizes UI elements during sessions.
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <input
              type="checkbox"
              className="accent-white"
              checked={settings.calmSessionMode}
              onChange={(e) => setSettings({ calmSessionMode: e.target.checked })}
            />
            Enabled
          </label>
        </div>
      </div>
    </div>
  );
}
