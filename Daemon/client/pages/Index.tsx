import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlowParticles from "@/components/GlowParticles";

export default function Index() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Set dummy wallet for bypassing auth check
    localStorage.setItem('wallet_address', 'BETA_USER');
    localStorage.setItem('wallet_type', 'debug');
    
    const t1 = setTimeout(() => setExiting(true), 2000); // Faster transition
    const t2 = setTimeout(() => navigate("/chat"), 2500); // Go directly to chat
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen overflow-hidden bg-[#05070b]">
      <div className="relative grid min-h-screen place-items-center">
        {/* soft radial glow */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* smoother, larger blue glows with blur and gentle pulse; zoom out on exit */}
          <motion.div
            className="absolute left-1/2 top-1/2 -z-10 h-[110vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0.15) 45%, transparent 70%)",
            }}
            animate={
              exiting
                ? { scale: 1.6, opacity: 0 }
                : { scale: [1, 1.06, 1], opacity: [0.75, 0.9, 0.75] }
            }
            transition={{
              duration: exiting ? 0.8 : 7,
              repeat: exiting ? 0 : Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 -z-10 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0.12) 50%, transparent 75%)",
            }}
            animate={
              exiting
                ? { scale: 1.8, opacity: 0 }
                : { scale: [1.02, 1.08, 1.02], opacity: [0.5, 0.7, 0.5] }
            }
            transition={{
              duration: exiting ? 0.8 : 7,
              repeat: exiting ? 0 : Infinity,
              ease: "easeInOut",
            }}
          />
          {/* corner soft blue accents */}
          <motion.div
            className="absolute left-[15%] top-[20%] -z-10 h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(59,130,246,0.25), transparent 70%)",
            }}
            animate={exiting ? { opacity: 0 } : { opacity: [0.2, 0.35, 0.2] }}
            transition={{
              duration: exiting ? 0.8 : 7,
              repeat: exiting ? 0 : Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute right-[12%] bottom-[15%] -z-10 h-[42vmin] w-[42vmin] translate-x-1/2 translate-y-1/2 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(29,78,216,0.22), transparent 70%)",
            }}
            animate={exiting ? { opacity: 0 } : { opacity: [0.18, 0.3, 0.18] }}
            transition={{
              duration: exiting ? 0.8 : 7,
              repeat: exiting ? 0 : Infinity,
              ease: "easeInOut",
            }}
          />
          {/* top/bottom blue bands to eliminate black bars */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(17,24,39,0.9), rgba(2,6,23,0.6) 35%, rgba(2,6,23,0.6) 65%, rgba(17,24,39,0.9))",
            }}
          />
          {/* rotating conic gradient mesh for elegant depth */}
          <motion.div
            className="absolute inset-0 -z-10 mix-blend-screen opacity-40"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, rgba(37,99,235,0.20), rgba(99,102,241,0.18), rgba(37,99,235,0.20))",
            }}
            animate={
              exiting ? { rotate: 20, opacity: 0 } : { rotate: 0, opacity: 0.4 }
            }
            transition={{
              duration: exiting ? 0.8 : 16,
              repeat: exiting ? 0 : Infinity,
              ease: "linear",
            }}
          />
          {/* subtle vignette for focus */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          {/* floating glow particles */}
          <GlowParticles count={28} />

          {/* full-viewport subtle shine sweep (separate layer to ensure visibility) */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-20"
            initial={{ x: "-70vw", opacity: 0 }}
            animate={{ x: ["-70vw", "70vw"], opacity: [0, 0.3, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: "200vw",
              height: "200vh",
              transform: "translate(-50%, -50%) rotate(18deg)",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 60%)",
              filter: "blur(18px)",
              mixBlendMode: "screen",
            }}
          />
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={
            exiting ? { scale: 1.2, opacity: 0 } : { scale: 1, opacity: 1 }
          }
          transition={{ duration: exiting ? 0.8 : 0.8, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <motion.div
            className="relative mb-6 grid place-items-center p-0"
            initial={{ y: 6 }}
            animate={exiting ? { scale: 1.8, y: 0 } : { y: [6, -4, 6] }}
            transition={
              exiting
                ? { duration: 0.8, ease: "easeInOut" }
                : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {/* circular aura under logo for elegance */}
            <motion.div
              aria-hidden
              className="absolute -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
              style={{
                left: "50%",
                top: "50%",
                background:
                  "radial-gradient(circle at center, rgba(59,130,246,0.35), rgba(59,130,246,0.12) 55%, transparent 70%)",
              }}
              animate={
                exiting
                  ? { scale: 1.6, opacity: 0 }
                  : { scale: [1, 1.04, 1], opacity: [0.7, 0.85, 0.7] }
              }
              transition={{
                duration: exiting ? 0.8 : 7,
                repeat: exiting ? 0 : Infinity,
                ease: "easeInOut",
              }}
            />
            {!exiting ? (
              <img
                src="https://cdn.builder.io/o/assets%2Fab5c614cfe5b4908ac888441c9926f4e%2F07ba890e3aab4ca6849316c4a5f61771?alt=media&token=4e518cea-12ba-4b50-9caa-0bb566b9a85e&apiKey=ab5c614cfe5b4908ac888441c9926f4e"
                alt="Daemon blink logo"
                className="h-72 w-72 object-contain md:h-80 md:w-80"
              />
            ) : (
              <motion.img
                src="https://cdn.builder.io/o/assets%2Fab5c614cfe5b4908ac888441c9926f4e%2Fe619075757534028b6758b1e88bb9b7b?alt=media&token=33c8bc3a-75dc-497b-90c5-b58307046e3b&apiKey=ab5c614cfe5b4908ac888441c9926f4e"
                alt="Daemon logo"
                className="h-72 w-72 object-contain md:h-80 md:w-80"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0.9 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            )}
            {/* full-screen soft shine sweep, feathered and rotated */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 z-30"
              initial={{ x: "-60vw", opacity: 0 }}
              animate={{ x: ["-60vw", "60vw"], opacity: [0, 0.6, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: "200vmax",
                height: "200vmax",
                transform: "translate(-50%, -50%) rotate(20deg)",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 34%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 66%)",
                WebkitMaskImage:
                  "radial-gradient(circle at center, rgba(255,255,255,1) 65%, rgba(255,255,255,0) 90%)",
                maskImage:
                  "radial-gradient(circle at center, rgba(255,255,255,1) 65%, rgba(255,255,255,0) 90%)",
                filter: "blur(14px)",
                mixBlendMode: "screen",
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
