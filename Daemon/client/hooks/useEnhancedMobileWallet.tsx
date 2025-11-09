/**
 * Enhanced Mobile Wallet Hook with Official Patterns
 * Combines the enhanced adapter with official mobile wallet adapter patterns
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { enhancedMWA, DEFAULT_APP_IDENTITY, DEFAULT_CHAINS, type EnhancedAuthorizationResult, type MobileWalletConnectionOptions, type Chain } from '@/utils/enhancedMobileWalletAdapter';
import { useToast } from '@/hooks/use-toast';
import { mobileWalletLogger, startTimer, endTimer } from '@/utils/mobileWalletLogger';
import { networkMonitor } from '@/utils/networkMonitor';
import { reportMobileWalletError, reportNetworkError } from '@/utils/errorReporter';

export interface WalletInfo {
  address: string;
  type: 'phantom' | 'solflare' | 'backpack' | 'enhanced-mwa';
  isConnected: boolean;
  chain?: Chain;
  label?: string;
}

export interface EnhancedMobileWalletState {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  isAvailable: boolean;
  isAuthorized: boolean;
  capabilities: any | null;
  authResult: EnhancedAuthorizationResult | null;
  supportedChains: Chain[];
  currentChain: Chain | null;
  walletDisplayInfo: any | null;
}

export interface EnhancedMobileWalletActions {
  connect: (chain?: Chain, signInInput?: any) => Promise<void>;
  connectWithCustomOptions: (options: MobileWalletConnectionOptions) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
  switchChain: (chain: Chain) => Promise<void>;
  refreshCapabilities: () => Promise<void>;
  clearError: () => void;
  retryConnection: () => Promise<void>;
}

export type EnhancedMobileWalletHook = EnhancedMobileWalletState & EnhancedMobileWalletActions;

/**
 * Guarded callback pattern from official examples
 */
function useGuardedCallback<TArgs extends Array<any>, TReturn>(
  cb: (...args: TArgs) => TReturn,
  dependencies?: Array<any>,
) {
  return useCallback(
    async (...args: TArgs) => {
      try {
        return await cb(...args);
      } catch (error) {
        console.error('Guarded callback error:', error);
        // Re-throw to let the caller handle it
        throw error;
      }
    },
    dependencies
  ) as (...args: TArgs) => Promise<Awaited<TReturn>>;
}

/**
 * Enhanced Mobile Wallet Hook
 */
export function useEnhancedMobileWallet(): EnhancedMobileWalletHook {
  const { toast } = useToast();
  const [state, setState] = useState<EnhancedMobileWalletState>({
    wallet: null,
    isConnecting: false,
    error: null,
    isAvailable: false,
    isAuthorized: false,
    capabilities: null,
    authResult: null,
    supportedChains: DEFAULT_CHAINS,
    currentChain: null,
    walletDisplayInfo: null,
  });

  const [pendingConnection, setPendingConnection] = useState<MobileWalletConnectionOptions | null>(null);

  // Initialize and check availability
  useEffect(() => {
    const checkAvailability = async () => {
      const available = enhancedMWA.isAvailable();
      setState(prev => ({ ...prev, isAvailable: available }));

      if (available) {
        // Load cached authorization
        const authState = enhancedMWA.getAuthorizationState();
        if (authState) {
          const walletInfo: WalletInfo = {
            address: authState.selectedAccount?.address.address || authState.accounts[0]?.address.address || '',
            type: 'enhanced-mwa',
            isConnected: true,
            chain: authState.chain,
            label: authState.selectedAccount?.label,
          };

          setState(prev => ({
            ...prev,
            wallet: walletInfo,
            authResult: authState,
            isAuthorized: true,
            currentChain: authState.chain || DEFAULT_CHAINS[0],
          }));
        }

        // Load capabilities
        try {
          const capabilities = await enhancedMWA.getCapabilities();
          setState(prev => ({ ...prev, capabilities }));
        } catch (error) {
          console.warn('Failed to load capabilities:', error);
        }
      }
    };

    checkAvailability();
  }, []);

  // Load wallet from localStorage on mount (for backward compatibility)
  useEffect(() => {
    const address = localStorage.getItem('wallet_address');
    const type = localStorage.getItem('wallet_type');

    if (address && type === 'enhanced-mwa' && !state.wallet) {
      setState(prev => ({
        ...prev,
        wallet: {
          address,
          type: 'enhanced-mwa',
          isConnected: true,
        },
        isAuthorized: true,
      }));
    }
  }, []);

  // Enhanced connect function with official patterns
  const connect = useGuardedCallback(async (chain?: Chain, signInInput?: any) => {
    const timerId = startTimer('enhanced_mwa_connect');
    mobileWalletLogger.info('connection', 'Starting enhanced MWA connection', {
      chain: chain || DEFAULT_CHAINS[0],
      hasSignInInput: !!signInInput
    });

    const options: MobileWalletConnectionOptions = {
      chain: chain || DEFAULT_CHAINS[0],
      identity: DEFAULT_APP_IDENTITY,
      signInInput,
      addressSelector: async (accounts) => {
        mobileWalletLogger.debug('connection', 'Address selector called', { accountCount: accounts.length });
        return accounts[0];
      },
      onWalletNotFound: () => {
        mobileWalletLogger.warn('connection', 'Wallet not found during connection');
        reportMobileWalletError('Wallet not found', 'connect', 'enhanced-mwa');
        toast({
          title: "Wallet Not Found",
          description: "No compatible mobile wallet found. Please install a Solana mobile wallet.",
          variant: "destructive",
        });
      },
    };

    try {
      await connectWithCustomOptions(options);
      endTimer(timerId, true);
    } catch (error) {
      endTimer(timerId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [toast]);

  // Connect with custom options
  const connectWithCustomOptions = useGuardedCallback(async (options: MobileWalletConnectionOptions) => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    setPendingConnection(options);

    try {
      if (!enhancedMWA.isAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      console.log('[EnhancedMWA] Starting authorization with options:', options);

      const result = await enhancedMWA.authorize(options);

      if (result.accounts && result.accounts.length > 0) {
        const selectedAccount = result.selectedAccount || result.accounts[0];
        const address = selectedAccount.address.address;

        const walletInfo: WalletInfo = {
          address,
          type: 'enhanced-mwa',
          isConnected: true,
          chain: result.chain || options.chain,
          label: selectedAccount.label,
        };

        setState(prev => ({
          ...prev,
          wallet: walletInfo,
          authResult: result,
          isAuthorized: true,
          currentChain: result.chain || options.chain || DEFAULT_CHAINS[0],
          error: null,
        }));

        // Store in localStorage for persistence
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_type', 'enhanced-mwa');

        // Dispatch custom event for app-wide state management
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { type: 'enhanced-mwa', address, chain: result.chain }
        }));

        toast({
          title: "Wallet Connected",
          description: `Successfully connected to ${selectedAccount.label || 'Mobile Wallet'}`,
        });

        console.log('[EnhancedMWA] Authorization successful:', result);
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (error: any) {
      console.error('[EnhancedMWA] Connection error:', error);
      const errorMessage = error.message || 'Failed to connect via Mobile Wallet Adapter';

      setState(prev => ({ ...prev, error: errorMessage }));

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setState(prev => ({ ...prev, isConnecting: false }));
      setPendingConnection(null);
    }
  }, [toast]);

  // Enhanced sign message function
  const signMessage = useGuardedCallback(async (message: string): Promise<Uint8Array> => {
    if (!state.wallet?.isConnected) {
      throw new Error('No wallet connected');
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      const signature = await enhancedMWA.signMessage(messageBytes, state.wallet.address);

      toast({
        title: "Message Signed",
        description: "Message was successfully signed",
        duration: 2000,
      });

      return signature;
    } catch (error: any) {
      console.error('[EnhancedMWA] Sign message error:', error);
      const errorMessage = error.message || 'Failed to sign message';

      setState(prev => ({ ...prev, error: errorMessage }));

      toast({
        title: "Signing Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [toast, state.wallet]);

  // Enhanced disconnect function
  const disconnect = useGuardedCallback(async () => {
    try {
      await enhancedMWA.deauthorize();

      setState(prev => ({
        ...prev,
        wallet: null,
        authResult: null,
        isAuthorized: false,
        currentChain: null,
        error: null,
      }));

      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('mwa_auth_token');

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('walletDisconnected'));

      toast({
        title: "Wallet Disconnected",
        description: "Successfully disconnected from mobile wallet",
      });
    } catch (error: any) {
      console.error('[EnhancedMWA] Disconnect error:', error);
      const errorMessage = error.message || 'Failed to disconnect wallet';

      setState(prev => ({ ...prev, error: errorMessage }));

      toast({
        title: "Disconnect Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Switch chain function
  const switchChain = useGuardedCallback(async (chain: Chain) => {
    if (!state.isAuthorized) {
      throw new Error('Wallet not authorized');
    }

    try {
      setState(prev => ({ ...prev, isConnecting: true }));

      // For mobile wallets, chain switching typically requires reconnection
      const options: MobileWalletConnectionOptions = {
        chain,
        identity: DEFAULT_APP_IDENTITY,
        addressSelector: async (accounts) => accounts[0],
      };

      const result = await enhancedMWA.authorize(options);

      if (result.accounts && result.accounts.length > 0) {
        const selectedAccount = result.selectedAccount || result.accounts[0];
        const address = selectedAccount.address.address;

        const walletInfo: WalletInfo = {
          address,
          type: 'enhanced-mwa',
          isConnected: true,
          chain: result.chain,
          label: selectedAccount.label,
        };

        setState(prev => ({
          ...prev,
          wallet: walletInfo,
          authResult: result,
          currentChain: result.chain,
          isConnecting: false,
        }));

        toast({
          title: "Chain Switched",
          description: `Switched to ${chain.namespace}:${chain.chainId}`,
        });
      }
    } catch (error: any) {
      console.error('[EnhancedMWA] Chain switch error:', error);
      setState(prev => ({ ...prev, isConnecting: false }));

      toast({
        title: "Chain Switch Failed",
        description: error.message || 'Failed to switch chain',
        variant: "destructive",
      });

      throw error;
    }
  }, [toast, state.isAuthorized]);

  // Refresh capabilities
  const refreshCapabilities = useGuardedCallback(async () => {
    if (!state.isAvailable) return;

    try {
      const capabilities = await enhancedMWA.getCapabilities();
      setState(prev => ({ ...prev, capabilities }));
    } catch (error) {
      console.warn('Failed to refresh capabilities:', error);
    }
  }, [state.isAvailable]);

  // Retry connection
  const retryConnection = useGuardedCallback(async () => {
    if (pendingConnection) {
      await connectWithCustomOptions(pendingConnection);
    } else {
      await connect();
    }
  }, [pendingConnection, connect, connectWithCustomOptions]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const walletDisplayInfo = useMemo(() => {
    if (!state.wallet) return null;

    return {
      ...state.wallet,
      truncatedAddress: `${state.wallet.address.slice(0, 4)}...${state.wallet.address.slice(-4)}`,
      chainName: state.currentChain ? `${state.currentChain.namespace}:${state.currentChain.chainId}` : 'Unknown',
    };
  }, [state.wallet, state.currentChain]);

  // Listen for visibility changes to refresh state
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && state.isAvailable) {
        // Refresh authorization state when app becomes visible
        const authState = enhancedMWA.getAuthorizationState();
        if (authState && !state.isAuthorized) {
          // Re-sync state if wallet is authorized but hook doesn't know
          const walletInfo: WalletInfo = {
            address: authState.selectedAccount?.address.address || authState.accounts[0]?.address.address || '',
            type: 'enhanced-mwa',
            isConnected: true,
            chain: authState.chain,
            label: authState.selectedAccount?.label,
          };

          setState(prev => ({
            ...prev,
            wallet: walletInfo,
            authResult: authState,
            isAuthorized: true,
            currentChain: authState.chain || DEFAULT_CHAINS[0],
          }));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isAvailable, state.isAuthorized]);

  return {
    ...state,
    connect,
    connectWithCustomOptions,
    disconnect,
    signMessage,
    switchChain,
    refreshCapabilities,
    clearError,
    retryConnection,
    walletDisplayInfo,
  };
}

/**
 * Hook for checking mobile wallet availability
 */
export function useMobileWalletAvailability() {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = enhancedMWA.isAvailable();
        setIsSupported(supported);
      } catch (error) {
        console.error('Error checking mobile wallet support:', error);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  return { isSupported, isLoading };
}

/**
 * Hook for wallet capabilities
 */
export function useMobileWalletCapabilities() {
  const [capabilities, setCapabilities] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCapabilities = useCallback(async () => {
    try {
      if (enhancedMWA.isAvailable()) {
        const caps = await enhancedMWA.getCapabilities();
        setCapabilities(caps);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  return { capabilities, isLoading, error, refetch: loadCapabilities };
}

export default useEnhancedMobileWallet;