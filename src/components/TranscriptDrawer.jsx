import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TranscriptDrawer({ open, onClose, guide, currentSec, reducedMotion }) {
  const cues = guide?.cues ?? [];
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 p-4 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Transcript"
        >
          <motion.div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121225] p-4"
            initial={reducedMotion ? { opacity: 1, y: 0 } : { y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: 18, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">Transcript</div>
                <div className="text-sm text-white/65 mt-1">{guide?.title ?? "—"}</div>
              </div>
              <button
                className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-auto space-y-2 pr-1">
              {cues.map((c, idx) => {
                const active =
                  currentSec >= c.atSec && (idx === cues.length - 1 || currentSec < cues[idx + 1].atSec);
                return (
                  <div
                    key={idx}
                    className={[
                      "rounded-2xl border p-3",
                      active ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <div className="text-xs text-white/60">{formatSec(c.atSec)}</div>
                    <div className="text-sm text-white/90 font-semibold mt-1">{c.text}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function formatSec(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
