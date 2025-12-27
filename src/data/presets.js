export function defaultPresets() {
  const now = new Date().toISOString();
  return [
    {
      id: "preset_calm_focus",
      name: "Calm Focus",
      layers: { master: { vol: 0.58 }, white: { vol: 0.0 }, pink: { vol: 0.34 }, tone: { vol: 0.10, hz: 144 } },
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "preset_soft_sleep",
      name: "Soft Sleep",
      layers: { master: { vol: 0.52 }, white: { vol: 0.0 }, pink: { vol: 0.42 }, tone: { vol: 0.06, hz: 110 } },
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
    {
      id: "preset_clear_mind",
      name: "Clear Mind",
      layers: { master: { vol: 0.56 }, white: { vol: 0.10 }, pink: { vol: 0.22 }, tone: { vol: 0.08, hz: 160 } },
      createdAt: now,
      updatedAt: now,
      isBuiltIn: true,
    },
  ];
}

export function newPresetFrom(base, name) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
    name,
    layers: JSON.parse(JSON.stringify(base.layers)),
    createdAt: now,
    updatedAt: now,
    isBuiltIn: false,
  };
}
