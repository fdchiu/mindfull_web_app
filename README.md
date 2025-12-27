# Mindful Web

Modern meditation companion focused on low-friction sessions, soundscapes, gentle cues, and on-device progress.

## Features
- Session flow: configure → run → reflect with mood + notes
- Soundscapes: Web Audio mixer with editable presets + custom layers
- Guided experience: timed cues, transcript drawer, and optional TTS
- YouTube mode: curated list + mock search provider (no API key needed)
- Progress dashboard: streak tracker, weekly minutes chart, history list
- Local-first storage: Dexie (IndexedDB) with JSON export/import helpers
- Accessibility: calm session mode, reduced motion, focus states, shortcuts

## Requirements
- Node.js 18 or newer

## Getting started
```bash
npm install        # install deps
npm run dev        # start Vite dev server
```

### Production build
```bash
npm run build      # generate dist/
npm run preview    # preview the production build
```

## Keyboard shortcuts
- Space: pause/resume (while on Session tab)
- Esc: open end-session confirmation
- T: toggle transcript drawer (guided sessions)

## Data + configuration
- Sessions, presets, and UI settings live in IndexedDB (Dexie); `src/data/repo.js` provides the persistence API.
- Export/import buttons in the Progress tab allow JSON backups and restores.
- YouTube search relies on a mock provider for evaluation; plug in a server-side proxy + YouTube Data API key when ready for production.

## Tech stack
- React 18 + Vite + Tailwind CSS
- Framer Motion, Recharts, Dexie, Web Audio, Web Speech Synthesis, YouTube iframe API
