import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function EndSessionDialog({ open, onClose, onConfirm, reducedMotion }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus?.();
  }, [open]);

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
          aria-label="End session confirmation"
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121225] p-4"
            initial={reducedMotion ? { opacity: 1, y: 0 } : { y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: 18, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold">End session?</div>
            <div className="text-sm text-white/65 mt-1">
              You can save a reflection, or continue if you ended by mistake.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                ref={ref}
                className="rounded-full bg-white/10 px-4 py-3 font-semibold hover:bg-white/15"
                onClick={onClose}
              >
                Continue
              </button>
              <button
                className="rounded-full bg-gradient-to-br from-indigo-400 to-cyan-300 px-4 py-3 font-bold text-black hover:opacity-95"
                onClick={onConfirm}
              >
                End now
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
