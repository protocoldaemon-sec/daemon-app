import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface WalletSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletType: 'phantom' | 'solflare' | 'backpack' | null;
  onRedirect: () => void;
}

export default function WalletSuccessModal({
  isOpen,
  onClose,
  walletType,
  onRedirect,
}: WalletSuccessModalProps) {
  const walletName = walletType ? walletType.charAt(0).toUpperCase() + walletType.slice(1) : "Wallet";

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    if (isOpen) {
      // Automatically redirect after 2.5 seconds
      redirectTimer = setTimeout(() => {
        onRedirect();
      }, 2500);
    }
    return () => clearTimeout(redirectTimer);
  }, [isOpen, onRedirect]);

  const getWalletIcon = () => {
    switch (walletType) {
      case 'phantom':
        return (
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-purple-500 rounded-sm"></div>
            </div>
          </div>
        );
      case 'solflare':
        return (
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 font-bold text-lg">S</span>
            </div>
          </div>
        );
      case 'backpack':
        return (
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-500 rounded-sm"></div>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
            <div className="w-8 h-8" /> {/* Spacer */}
            
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
            {/* Success Icon with Check Mark */}
            <div className="relative inline-block mb-6">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
                {/* Wallet Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {getWalletIcon()}
                </div>
                
                {/* Success Check Mark */}
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </motion.div>
              </div>
            </div>

            {/* Success Message */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Successfully connected with {walletName}
              </h3>
              
              <p className="text-gray-400 text-sm leading-relaxed">
                You're good to go!
              </p>
            </div>

            {/* Continue Button */}
            <Button
              onClick={onRedirect}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-medium transition-colors"
            >
              Continue to Chat
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
