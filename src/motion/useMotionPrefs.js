import { useMemo } from "react";
import { usePrefersReducedMotion } from "../settings/useSettings";

export function useReducedMotionEffective(settingsReduceMotion) {
  const systemPref = usePrefersReducedMotion();
  return useMemo(() => {
    if (settingsReduceMotion === "on") return true;
    if (settingsReduceMotion === "off") return false;
    return systemPref;
  }, [settingsReduceMotion, systemPref]);
}
