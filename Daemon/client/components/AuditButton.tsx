import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function AuditButton({ onClick }: { onClick?: () => void }) {
  const [pulseKey, setPulseKey] = useState(0);

  const handleClick = () => {
    setPulseKey((k) => k + 1);
    onClick?.();
  };

  return (
    <div className="relative grid place-items-center">
      {/* Ambient glow */}
      <motion.div
        className="absolute -z-10 size-72 rounded-full bg-indigo-600/30 blur-3xl"
        animate={{ opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Idle breathing ring */}
      <motion.div
        className="absolute size-72 rounded-full border border-indigo-400/30"
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Button core */}
      <motion.button
        aria-label="Smartcontract Security Audit"
        onClick={handleClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="relative grid size-56 place-items-center rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-[0_20px_60px_rgba(62,90,255,0.35)] focus:outline-none"
      >
        <div className="grid size-40 place-items-center rounded-full bg-gradient-to-b from-white/15 to-white/5 backdrop-blur-sm">
          <ShieldCheck className="size-16 text-white" />
        </div>

        {/* Subtle rotating shine */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </motion.button>

      {/* Click waves */}
      <AnimatePresence initial={false}>
        <Wave key={pulseKey} />
      </AnimatePresence>

      <div className="mt-6 text-base font-medium text-indigo-300">Smartcontract Security Audit</div>
    </div>
  );
}

function Wave() {
  return (
    <motion.span
      className="pointer-events-none absolute z-[-1] size-56 rounded-full"
      initial={{ scale: 1, opacity: 0.35, boxShadow: "0 0 0 0 rgba(99,102,241,0.45)" }}
      animate={{ scale: 1.6, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
