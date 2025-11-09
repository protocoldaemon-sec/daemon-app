import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  walletType: 'phantom' | 'solflare' | 'backpack' | null;
  isConnecting: boolean;
  error?: string | null;
}

export default function WalletConnectionModal({
  isOpen,
  onClose,
  onBack,
  walletType,
  isConnecting,
  error
}: WalletConnectionModalProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isConnecting) {
      // Simulate progress animation
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return 90; // Don't complete until actual connection
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isConnecting]);

  const getWalletInfo = () => {
    switch (walletType) {
      case 'phantom':
        return {
          name: 'Phantom',
          icon: (
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-purple-500 rounded-sm"></div>
              </div>
            </div>
          ),
          color: 'from-purple-500 to-purple-700',
          ringColor: 'ring-purple-500/30'
        };
      case 'solflare':
        return {
          name: 'Solflare',
          icon: (
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-lg">S</span>
              </div>
            </div>
          ),
          color: 'from-yellow-500 to-orange-500',
          ringColor: 'ring-yellow-500/30'
        };
      case 'backpack':
        return {
          name: 'Backpack',
          icon: (
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
              </div>
            </div>
          ),
          color: 'from-red-500 to-pink-500',
          ringColor: 'ring-red-500/30'
        };
      default:
        return {
          name: 'Wallet',
          icon: (
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-500 rounded-sm"></div>
              </div>
            </div>
          ),
          color: 'from-gray-500 to-gray-700',
          ringColor: 'ring-gray-500/30'
        };
    }
  };

  const walletInfo = getWalletInfo();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          className="relative w-full max-w-sm bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full w-8 h-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center">
            {/* Wallet Icon with Progress Ring */}
            <div className="relative inline-block mb-6">
              <div className={`relative w-20 h-20 rounded-full ${walletInfo.ringColor} ring-4 ring-offset-4 ring-offset-gray-900`}>
                {/* Progress Ring */}
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <motion.path
                    className={`text-gradient-to-r ${walletInfo.color}`}
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={`${progress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${progress}, 100` }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                
                {/* Wallet Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={isConnecting ? { 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    } : {}}
                    transition={{ 
                      duration: 2,
                      repeat: isConnecting ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    {walletInfo.icon}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Status Text */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                {error ? 'Connection Failed' : isConnecting ? 'Sign to verify' : 'Connecting'}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed">
                {error ? (
                  <span className="text-red-400">{error}</span>
                ) : isConnecting ? (
                  `Don't see your ${walletInfo.name} wallet? Check your other browser windows.`
                ) : (
                  `Connecting to ${walletInfo.name} wallet...`
                )}
              </p>
            </div>

            {/* Action Button */}
            <div className="space-y-3">
              {error ? (
                <Button
                  onClick={onBack}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl h-12 font-medium"
                >
                  Try Again
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full bg-gray-800 text-gray-400 rounded-xl h-12 font-medium cursor-not-allowed"
                >
                  {isConnecting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting
                    </div>
                  ) : (
                    'Connecting'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Gradient Definition */}
          <svg className="absolute opacity-0">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={walletType === 'phantom' ? '#8b5cf6' : walletType === 'solflare' ? '#eab308' : '#ef4444'} />
                <stop offset="100%" stopColor={walletType === 'phantom' ? '#7c3aed' : walletType === 'solflare' ? '#f97316' : '#ec4899'} />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
