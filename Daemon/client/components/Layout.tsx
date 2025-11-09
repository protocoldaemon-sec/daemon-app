import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Crown, X, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useGSAPFadeIn } from "@/hooks/useGSAP";
import DaemonLogo from "@/assets/logo/daemon-logo.svg";
import DaemonLogoBlack from "@/assets/logo/daemon-logo-black.svg";
import { useTheme } from "@/hooks/useTheme";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { DebugFloatingButton, DevelopmentInfoBanner } from "@/components/DebugFloatingButton";
import { useEffect, useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const contentRef = useGSAPFadeIn(0.3);
  const { theme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  useEffect(() => setMounted(true), []);
  const logoSrc = (mounted && theme === 'light') ? DaemonLogoBlack : DaemonLogo;

  const addressUSDC = "Hu3YoWcfd8jUFHz5hVv21gThDPRexj2eP1YDWG7LEs6z";
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(addressUSDC);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background mobile-container mobile-viewport-fix">
      {/* Development Info Banner */}
      <DevelopmentInfoBanner />

      <div className="flex mobile-container">
        {/* Desktop Sidebar - Fixed on desktop, hidden on mobile */}
        <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:block md:w-64">
          <Sidebar />
        </div>
        {/* Main content area with proper spacing to account for sidebar */}
        <div className="flex-1 md:pl-64 mobile-container mobile-gpu">
          <main className="min-h-screen mobile-container">
            <motion.header
              className="sticky top-0 z-50 flex items-center justify-center border-b bg-background/80 backdrop-blur-xl px-4 py-3 text-foreground md:hidden relative safe-top mobile-shadow"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              delay: 0.05
            }}
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="absolute left-4">
              <MobileNav />
            </div>
            <motion.div
              className="flex items-center justify-center mobile-gpu"
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* <DaemonLogo size={24} className="text-foreground" /> */}
              <img
                key={theme}
                src={logoSrc}
                className="text-foreground mobile-gpu"
                width={32}
                height={32}
                loading="eager"
                decoding="async"
              />

            </motion.div>
            <div className="absolute right-4 flex items-center gap-2">
              <ThemeSwitcher />
              <motion.button
                aria-label="Premium"
                onClick={() => setShowPremium(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-muted p-3 text-foreground mobile-shadow press-feedback"
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown className="size-4 text-orange-400" />
              </motion.button>
            </div>
          </motion.header>
          <div
            ref={contentRef}
            className="mobile-container mobile-scroll mobile-gpu"
            style={{
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            <div className="safe-bottom safe-left safe-right">
              {children}
            </div>
          </div>
        </main>
        </div> {/* Close the content wrapper div */}
      </div> {/* Close the main flex div */}

      {/* Premium Modal */}
      {showPremium && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[60]"
          aria-modal
          role="dialog"
        >
          {/* Backdrop */}
          <div
            onClick={() => setShowPremium(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          {/* Sheet-like iOS modal */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className={`absolute inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bottom-6 md:top-1/2 md:-translate-y-1/2 md:w-[460px] rounded-3xl shadow-2xl overflow-hidden ${
              isDark ? 'bg-slate-900/95 border border-slate-700/60' : 'bg-white/95 border border-slate-200'
            }`}
          >
            <div className="relative px-5 pt-5 pb-4 md:px-6 md:pt-6 md:pb-5">
              <button
                aria-label="Close"
                onClick={() => setShowPremium(false)}
                className={`absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-1.5 ${
                  isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex rounded-2xl p-2 bg-gradient-to-br from-yellow-400 to-orange-500 shadow-sm">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <h2 className={`text-lg md:text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Upgrade to Pro
                </h2>
              </div>

              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                The Free plan includes up to <span className="font-semibold">100 address requests per month</span>.
                Unlock higher limits and priority processing by upgrading to Pro.
              </p>

              <div className={`mt-4 rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-800/60 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                <div className={`text-xs uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Pay with USDC on Solana
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs md:text-sm break-all select-all flex-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{addressUSDC}</code>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowPremium(false)}
                  className={`h-11 rounded-2xl text-sm font-semibold transition-colors ${
                    isDark ? 'bg-white/10 hover:bg-white/15 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                >
                  Not now
                </button>
                <a
                  href={`https://solscan.io/account/${addressUSDC}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`h-11 rounded-2xl text-sm font-semibold inline-flex items-center justify-center transition-all ${
                    isDark ? 'bg-indigo-500 hover:bg-indigo-500/90 text-white shadow-indigo-500/20 shadow-lg' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 shadow-lg'
                  }`}
                >
                  View Address
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Debug Floating Button */}
      <DebugFloatingButton />
    </div>
  );
}
