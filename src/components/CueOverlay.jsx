import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CueOverlay({ cue, onOpenTranscript, reducedMotion }) {
  return (
    <AnimatePresence>
      {cue ? (
        <motion.div
          className="fixed inset-x-0 top-4 z-40 flex justify-center px-4"
          initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121225]/90 backdrop-blur p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-white/60">Guided cue</div>
                <div className="mt-1 text-white/90 font-semibold leading-snug">{cue.text}</div>
              </div>
              <button
                className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                onClick={onOpenTranscript}
              >
                Transcript
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
