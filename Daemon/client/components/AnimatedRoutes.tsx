import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Onboarding1 from "@/pages/Onboarding1";
import Onboarding2 from "@/pages/Onboarding2";
import LoginSolana from "@/pages/LoginSolana";
import WalletConnection from "@/pages/WalletConnection";
import History from "@/pages/History";
import ChatCopilot from "@/pages/ChatCopilot";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import DaemonAnalysisDashboard from "@/components/DaemonAnalysisDashboard";
import MonitorDashboard from "@/pages/MonitorDashboard";
import TestMobileWallet from "@/pages/TestMobileWallet";
import Layout from "@/components/Layout";
import ProtectedRoute, { AuthRoute, GuestRoute } from "@/components/ProtectedRoute";

export default function AnimatedRoutes() {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // GSAP animations on route change
  useEffect(() => {
    if (!mounted) return;
    
    if (contentRef.current) {
      // Advanced GSAP timeline for smooth entrance
      const tl = gsap.timeline();
      
      tl.fromTo(
        contentRef.current,
        {
          opacity: 0,
          scale: 0.95,
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'power3.out',
        }
      );
    }
  }, [location.pathname, mounted]);

  const pageVariants = {
    initial: {
      opacity: 0,
      x: 50,
      scale: 0.98,
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      x: -50,
      scale: 1.02,
    }
  };

  const pageTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  };

  // Prevent animation on initial mount - render immediately without animation
  if (!mounted) {
    return (
      <div style={{ width: '100%', minHeight: '100vh' }}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/onboarding-1" element={<Onboarding />} />
          <Route path="/onboarding-2" element={<Onboarding />} />
          <Route path="/login" element={<GuestRoute><LoginSolana /></GuestRoute>} />
          <Route path="/wallet-connection" element={<GuestRoute><WalletConnection /></GuestRoute>} />
          <Route
            path="/history"
            element={
              <AuthRoute>
                <Layout>
                  <History />
                </Layout>
              </AuthRoute>
            }
          />
          <Route
              path="/chat"
              element={
                <AuthRoute>
                  <Layout>
                    <ChatCopilot />
                  </Layout>
                </AuthRoute>
              }
            />
          <Route
            path="/settings"
            element={
              <AuthRoute>
                <Layout>
                  <Settings />
                </Layout>
              </AuthRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthRoute>
                <Layout>
                  <Profile />
                </Layout>
              </AuthRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <AuthRoute>
                <Layout>
                  <DaemonAnalysisDashboard />
                </Layout>
              </AuthRoute>
            }
          />
          <Route
            path="/monitor-dashboard"
            element={
              <AuthRoute>
                <Layout>
                  <MonitorDashboard />
                </Layout>
              </AuthRoute>
            }
          />
          <Route
            path="/test-mobile-wallet"
            element={
              <AuthRoute>
                <Layout>
                  <TestMobileWallet />
                </Layout>
              </AuthRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ 
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          willChange: 'transform, opacity',
        }}
      >
        <div ref={contentRef} style={{ width: '100%', minHeight: '100vh' }}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding-1" element={<Onboarding />} />
            <Route path="/onboarding-2" element={<Onboarding />} />
            <Route path="/login" element={<GuestRoute><LoginSolana /></GuestRoute>} />
            <Route path="/wallet-connection" element={<GuestRoute><WalletConnection /></GuestRoute>} />
            <Route
              path="/history"
              element={
                <AuthRoute>
                  <Layout>
                    <History />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <AuthRoute>
                  <Layout>
                    <ChatCopilot />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AuthRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <AuthRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <AuthRoute>
                  <Layout>
                    <DaemonAnalysisDashboard />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/monitor-dashboard"
              element={
                <AuthRoute>
                  <Layout>
                    <MonitorDashboard />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route
              path="/test-mobile-wallet"
              element={
                <AuthRoute>
                  <Layout>
                    <TestMobileWallet />
                  </Layout>
                </AuthRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
