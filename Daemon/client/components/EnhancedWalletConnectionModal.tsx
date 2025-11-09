/**
 * Enhanced Wallet Connection Modal
 * Supports both traditional browser wallets and enhanced mobile wallet adapter
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone,
  Laptop,
  AlertCircle,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Download,
  ExternalLink
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useWallet } from "@/hooks/useWallet";
import { useEnhancedMobileWallet, useMobileWalletAvailability } from "@/hooks/useEnhancedMobileWallet";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PhantomLogo from "@/assets/logo/phantom-logo.svg";
import SolflareLogo from "@/assets/logo/solflare-logo.svg";
import DaemonLogo from "@/assets/logo/daemon-logo-black.svg";

interface EnhancedWalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (walletType: string) => void;
  preferredTab?: 'browser' | 'mobile';
}

export function EnhancedWalletConnectionModal({
  isOpen,
  onClose,
  onSuccess,
  preferredTab = 'browser'
}: EnhancedWalletConnectionModalProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(preferredTab);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // Traditional wallet hooks
  const { connectPhantom, connectSolflare, connectBackpack, error: traditionalError } = useWallet();

  // Enhanced mobile wallet hooks
  const enhancedMobile = useEnhancedMobileWallet();
  const { isSupported: isMobileSupported } = useMobileWalletAvailability();

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(preferredTab);
    }
  }, [isOpen, preferredTab]);

  // Browser wallet connection handlers
  const handleConnectPhantom = useCallback(async () => {
    setIsConnecting('phantom');
    try {
      await connectPhantom();
      onSuccess?.('phantom');
      onClose();
    } catch (error) {
      console.error('Phantom connection failed:', error);
    } finally {
      setIsConnecting(null);
    }
  }, [connectPhantom, onSuccess, onClose]);

  const handleConnectSolflare = useCallback(async () => {
    setIsConnecting('solflare');
    try {
      await connectSolflare();
      onSuccess?.('solflare');
      onClose();
    } catch (error) {
      console.error('Solflare connection failed:', error);
    } finally {
      setIsConnecting(null);
    }
  }, [connectSolflare, onSuccess, onClose]);

  const handleConnectBackpack = useCallback(async () => {
    setIsConnecting('backpack');
    try {
      await connectBackpack();
      onSuccess?.('backpack');
      onClose();
    } catch (error) {
      console.error('Backpack connection failed:', error);
    } finally {
      setIsConnecting(null);
    }
  }, [connectBackpack, onSuccess, onClose]);

  // Mobile wallet connection handler
  const handleConnectMobile = useCallback(async () => {
    setIsConnecting('mobile');
    try {
      await enhancedMobile.connect();
      onSuccess?.('enhanced-mwa');
      onClose();
    } catch (error) {
      console.error('Mobile wallet connection failed:', error);
    } finally {
      setIsConnecting(null);
    }
  }, [enhancedMobile, onSuccess, onClose]);

  // Check wallet availability
  const isPhantomAvailable = typeof window !== 'undefined' && window.phantom?.solana?.isPhantom;
  const isSolflareAvailable = typeof window !== 'undefined' && window.solflare?.isSolflare;

  const browserWallets = [
    {
      id: 'phantom',
      name: 'Phantom',
      description: 'Most popular Solana wallet',
      icon: <img src={PhantomLogo} alt="Phantom" width={16} height={16} />,
      available: isPhantomAvailable,
      connect: handleConnectPhantom,
      isConnecting: isConnecting === 'phantom',
      color: 'from-purple-500 to-purple-600',
      downloadUrl: 'https://phantom.app/',
    },
    {
      id: 'solflare',
      name: 'Solflare',
      description: 'Secure Solana wallet',
      icon: <img src={SolflareLogo} alt="Solflare" width={16} height={16} />,
      available: isSolflareAvailable,
      connect: handleConnectSolflare,
      isConnecting: isConnecting === 'solflare',
      color: 'from-orange-500 to-orange-600',
      downloadUrl: 'https://solflare.com/',
    },
    ];

  const mobileWallets = [
    {
      id: 'mobile',
      name: 'Mobile Wallet',
      description: 'Connect via Mobile Wallet Adapter',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-smartphone w-3 h-3 text-white" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>,
      available: isMobileSupported,
      connect: handleConnectMobile,
      isConnecting: isConnecting === 'mobile',
      color: 'from-green-500 to-green-600',
      features: ['Biometric auth', 'Deep linking', 'Enhanced security'],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-md mx-auto",
        isDark
          ? "bg-black border-white/10"
          : "bg-white border-slate-200"
      )}>
        <DialogHeader>
          <DialogTitle className={cn(
            "text-lg font-medium",
            isDark ? "text-white" : "text-slate-900"
          )}>
            Connect Wallet
          </DialogTitle>
          <DialogDescription className={cn(
            "text-sm",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            Choose wallet to connect
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'mobile' | 'browser')} className="w-full">
          <TabsList className={cn(
            "grid w-full grid-cols-2 mb-3",
            isDark
              ? "bg-white/5 border-white/10"
              : "bg-slate-100 border-slate-200"
          )}>
            <TabsTrigger
              value="browser"
              className="text-xs"
            >
              Browser
            </TabsTrigger>
            <TabsTrigger
              value="mobile"
              className="text-xs"
            >
              Mobile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browser" className="space-y-2">
            {browserWallets.map((wallet) => (
              <Card key={wallet.id} className={cn(
                "cursor-pointer",
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-slate-50 border-slate-200",
                wallet.isConnecting && "opacity-50"
              )}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {wallet.icon}
                        </div>
                        <div>
                          <h3 className={cn(
                            "text-sm font-medium",
                            isDark ? "text-white" : "text-slate-900"
                          )}>
                            {wallet.name}
                          </h3>
                        </div>
                      </div>

                      {wallet.isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : wallet.available ? (
                        <Button
                          size="sm"
                          onClick={wallet.connect}
                          disabled={wallet.isConnecting}
                          className="h-8 px-3 text-xs"
                        >
                          Connect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(wallet.downloadUrl, '_blank')}
                          className="h-8 px-3 text-xs"
                        >
                          Install
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}

            {traditionalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{traditionalError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="mobile" className="space-y-2">
            {mobileWallets.map((wallet) => (
              <Card key={wallet.id} className={cn(
                "cursor-pointer",
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-slate-50 border-slate-200",
                wallet.isConnecting && "opacity-50"
              )}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {wallet.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "text-sm font-medium",
                              isDark ? "text-white" : "text-slate-900"
                            )}>
                              {wallet.name}
                            </h3>
                          </div>
                          <p className={cn(
                            "text-xs",
                            isDark ? "text-slate-500" : "text-slate-500"
                          )}>
                            {wallet.description}
                          </p>
                        </div>
                      </div>

                      {wallet.isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : wallet.available ? (
                        <Button
                          size="sm"
                          onClick={wallet.connect}
                          disabled={wallet.isConnecting}
                          className="h-8 px-3 text-xs"
                        >
                          Connect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open('https://phantom.app/blog/understanding-mobile-wallet-adapter', '_blank')}
                          className="h-8 px-3 text-xs"
                        >
                          Learn More
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}

        
            {enhancedMobile.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{enhancedMobile.error}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Secure connection</span>
            <span>Instant access</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Wallet icon component
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

export default EnhancedWalletConnectionModal;