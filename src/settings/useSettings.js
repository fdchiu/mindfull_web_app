import { useEffect, useState } from "react";
import { getSetting, setSetting } from "../data/repo.js";

const defaults = { reduceMotion: "system", highContrast: false, textScale: "normal", calmSessionMode: true };

export function useSettings() {
  const [settings, setSettingsState] = useState(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const reduceMotion = await getSetting("ui.reduceMotion", defaults.reduceMotion);
      const highContrast = await getSetting("ui.highContrast", defaults.highContrast);
      const textScale = await getSetting("ui.textScale", defaults.textScale);
      const calmSessionMode = await getSetting("ui.calmSessionMode", defaults.calmSessionMode);
      setSettingsState({ reduceMotion, highContrast: !!highContrast, textScale, calmSessionMode: !!calmSessionMode });
      setLoaded(true);
    })();
  }, []);

  const setSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettingsState(next);
    if ("reduceMotion" in patch) await setSetting("ui.reduceMotion", next.reduceMotion);
    if ("highContrast" in patch) await setSetting("ui.highContrast", next.highContrast);
    if ("textScale" in patch) await setSetting("ui.textScale", next.textScale);
    if ("calmSessionMode" in patch) await setSetting("ui.calmSessionMode", next.calmSessionMode);
  };

  return { settings, setSettings, loaded };
}

export function usePrefersReducedMotion() {
  const [pref, setPref] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => setPref(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return pref;
}
