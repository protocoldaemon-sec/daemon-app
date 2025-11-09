/**
 * Debug Floating Button for Quick Access to Monitoring Tools
 * Provides easy navigation to monitoring dashboard and test pages
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  TestTube,
  Monitor,
  Settings,
  X,
  ChevronRight,
  Smartphone,
  Bug,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function DebugFloatingButton() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Show/hide based on some condition (development mode, device type, etc.)
  const shouldShow = process.env.NODE_ENV === 'development' ||
                     navigator.userAgent.includes('Android') ||
                     window.location.hostname === 'localhost';

  if (!shouldShow || !isVisible) {
    return null;
  }

  const handleNavigate = (path: string, label: string) => {
    navigate(path);
    setIsOpen(false);
    console.log(`🔍 Debug Navigation: Opening ${label}`);
  };

  const debugTools = [
    {
      icon: <Monitor className="w-4 h-4" />,
      label: 'Monitor Dashboard',
      path: '/monitor-dashboard',
      description: 'Real-time logs and performance metrics',
      color: 'bg-blue-500/20 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-500/30'
    },
    {
      icon: <TestTube className="w-4 h-4" />,
      label: 'Test Mobile Wallet',
      path: '/test-mobile-wallet',
      description: 'Comprehensive MWA testing suite',
      color: 'bg-green-500/20 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-500/30'
    },
    {
      icon: <Bug className="w-4 h-4" />,
      label: 'Error Reports',
      path: '/monitor-dashboard?tab=analytics',
      description: 'Error analytics and reporting',
      color: 'bg-red-500/20 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-500/30'
    },
    {
      icon: <Activity className="w-4 h-4" />,
      label: 'Performance',
      path: '/monitor-dashboard?tab=performance',
      description: 'Performance monitoring and metrics',
      color: 'bg-purple-500/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-500/30'
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
          >
            <Card className={cn(
              "w-80 shadow-2xl border-2",
              isDark
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                      <Bug className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Debug Tools</CardTitle>
                      <CardDescription className="text-xs">
                        SM02G40619147403 • Enhanced MWA
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {debugTools.map((tool, index) => (
                    <motion.button
                      key={tool.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleNavigate(tool.path, tool.label)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200 hover:scale-[1.02]",
                        tool.color
                      )}
                    >
                      <div className="flex-shrink-0">
                        {tool.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{tool.label}</span>
                          <ChevronRight className="w-3 h-3 ml-auto" />
                        </div>
                        <p className="text-xs opacity-70 truncate">{tool.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Quick access for testing</span>
                    <button
                      onClick={() => setIsVisible(false)}
                      className="hover:text-foreground transition-colors"
                    >
                      Hide forever
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="sm"
          className={cn(
            "w-12 h-12 rounded-full shadow-lg border-2",
            isOpen
              ? "bg-gradient-to-br from-orange-500 to-red-500 border-orange-600 hover:from-orange-600 hover:to-red-600"
              : "bg-gradient-to-br from-blue-500 to-purple-600 border-blue-600 hover:from-blue-600 hover:to-purple-600"
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: 0, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="debug"
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Bug className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Hidden reset functionality - triple click the button to restore */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full opacity-0 hover:opacity-0"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}

/**
 * Development Info Banner
 * Shows device info and quick stats in development mode
 */
export function DevelopmentInfoBanner() {
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  const shouldShow = process.env.NODE_ENV === 'development';

  if (!shouldShow || !isVisible) {
    return null;
  }

  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isSolanaSeeker: /Seeker|Solana Mobile/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isFileProtocol: window.location.protocol === 'file:'
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border-b",
      isDark ? "border-slate-700" : "border-slate-200"
    )}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-mono">DEBUG MODE</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-3 h-3" />
              <span>{deviceInfo.isSolanaSeeker ? 'Solana Seeker' : 'Mobile Device'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" />
              <span>Enhanced MWA Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <span>Monitoring Enabled</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 px-2 text-xs"
          >
            Hide
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Access Panel for Settings Page
 * Add this to your Settings page for easy access to debug tools
 */
export function DebugAccessPanel() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const shouldShow = process.env.NODE_ENV === 'development' ||
                     navigator.userAgent.includes('Android');

  if (!shouldShow) {
    return null;
  }

  const debugActions = [
    {
      icon: <Monitor className="w-4 h-4" />,
      label: 'Monitor Dashboard',
      path: '/monitor-dashboard',
      description: 'Real-time monitoring and logs'
    },
    {
      icon: <TestTube className="w-4 h-4" />,
      label: 'Test Mobile Wallet',
      path: '/test-mobile-wallet',
      description: 'Run comprehensive MWA tests'
    }
  ];

  return (
    <div className="space-y-4">
      <div className={cn(
        "border-2 border-dashed rounded-lg p-4",
        isDark
          ? "border-orange-500/30 bg-orange-950/20"
          : "border-orange-300/50 bg-orange-50/50"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Bug className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-800 dark:text-orange-200">
            Debug Tools (Development)
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Quick access to monitoring and testing tools for Enhanced Mobile Wallet Adapter
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {debugActions.map((action) => (
            <Button
              key={action.path}
              variant="outline"
              onClick={() => navigate(action.path)}
              className="justify-start h-auto p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{action.icon}</div>
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}