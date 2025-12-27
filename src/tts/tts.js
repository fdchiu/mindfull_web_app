export function listVoices() {
  try { return window.speechSynthesis?.getVoices?.() ?? []; } catch { return []; }
}

export function speak(text, { voiceURI, rate = 0.95, pitch = 1.0, volume = 0.8 } = {}) {
  if (!text) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate; u.pitch = pitch; u.volume = volume;
  if (voiceURI) {
    const v = listVoices().find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
  }
  synth.speak(u);
}

export function cancelSpeak() { try { window.speechSynthesis?.cancel?.(); } catch {} }
