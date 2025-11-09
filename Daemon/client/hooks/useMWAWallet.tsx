import { useState, useEffect } from 'react';
import { mwa, DEFAULT_APP_IDENTITY, type AuthorizationResult } from '@/utils/mobileWalletAdapter';

interface WalletInfo {
  address: string;
  type: 'phantom' | 'solflare' | 'mwa';
  isConnected: boolean;
}

export function useMWAWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [authResult, setAuthResult] = useState<AuthorizationResult | null>(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const address = localStorage.getItem('wallet_address');
    const type = localStorage.getItem('wallet_type') as WalletInfo['type'];
    
    if (address && type && type === 'mwa') {
      setWallet({
        address,
        type: 'mwa',
        isConnected: true,
      });
    }
  }, []);

  const connect = async (cluster: string = 'solana:mainnet-beta'): Promise<void> => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!mwa.isAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      console.log('Starting MWA authorization...');
      
      const result = await mwa.authorize({
        cluster,
        identity: DEFAULT_APP_IDENTITY,
      });

      console.log('MWA authorization successful:', result);
      
      if (result.accounts && result.accounts.length > 0) {
        const address = result.accounts[0].address;
        
        const walletInfo: WalletInfo = {
          address,
          type: 'mwa',
          isConnected: true,
        };
        
        setWallet(walletInfo);
        setAuthResult(result);
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_type', 'mwa');
        localStorage.setItem('mwa_auth_token', result.auth_token || '');
        
        // Dispatch custom event for route protection
        window.dispatchEvent(new CustomEvent('walletConnected', { 
          detail: { type: 'mwa', address } 
        }));
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (err: any) {
      console.error('MWA connection error:', err);
      setError(err.message || 'Failed to connect via Mobile Wallet Adapter');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const signMessage = async (message: string): Promise<Uint8Array> => {
    if (!wallet?.isConnected) {
      throw new Error('No wallet connected');
    }

    const messageBytes = new TextEncoder().encode(message);
    
    try {
      const signature = await mwa.signMessage(messageBytes, wallet.address);
      return signature;
    } catch (err: any) {
      console.error('Sign message error:', err);
      setError(err.message || 'Failed to sign message');
      throw err;
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      await mwa.deauthorize();
      setWallet(null);
      setAuthResult(null);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('mwa_auth_token');
      
      // Dispatch custom event for route protection
      window.dispatchEvent(new CustomEvent('walletDisconnected'));
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  return {
    wallet,
    isConnecting,
    error,
    authResult,
    connect,
    signMessage,
    disconnect,
    isAvailable: mwa.isAvailable(),
    isAuthorized: mwa.isAuthorized(),
    clearError: () => setError(''),
  };
}

