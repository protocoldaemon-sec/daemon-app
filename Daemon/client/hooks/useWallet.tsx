import { useState, useEffect } from 'react';
import { connectToSolflare, connectToSolflareWithEvents } from '@/utils/solflareHelper';

interface WalletInfo {
  address: string;
  type: 'phantom' | 'solflare' | 'backpack';
  isConnected: boolean;
}

// Declare global wallet types
declare global {
  interface Window {
    solflare?: {
      isSolflare: boolean;
      connect: () => Promise<any>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{
        signature: Uint8Array;
      }>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      publicKey: any;
      isConnected: boolean;
    };
    phantom?: {
      solana?: {
        isPhantom: boolean;
        connect: () => Promise<{
          publicKey: string;
        }>;
        disconnect: () => Promise<void>;
        signMessage: (message: Uint8Array) => Promise<{
          signature: Uint8Array;
        }>;
        publicKey: {
          toString: () => string;
        } | null;
      };
    };
  }
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Load wallet from localStorage on mount
  useEffect(() => {
    const address = localStorage.getItem('wallet_address');
    const type = localStorage.getItem('wallet_type') as WalletInfo['type'];
    
    if (address && type) {
      setWallet({
        address,
        type,
        isConnected: true,
      });
    }
  }, []);

  const connectPhantom = async (): Promise<void> => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!window.phantom?.solana?.isPhantom) {
        throw new Error('Phantom wallet not found. Please install Phantom extension.');
      }

      const response = await window.phantom.solana.connect();
      
      if (response?.publicKey) {
        const publicKey = response.publicKey;
        const walletInfo: WalletInfo = {
          address: publicKey,
          type: 'phantom',
          isConnected: true,
        };
        
        setWallet(walletInfo);
        localStorage.setItem('wallet_address', publicKey);
        localStorage.setItem('wallet_type', 'phantom');
        
        // Dispatch custom event for route protection
        window.dispatchEvent(new CustomEvent('walletConnected', { 
          detail: { type: 'phantom', address: publicKey } 
        }));
      } else {
        throw new Error('Failed to connect to Phantom wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Phantom');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectSolflare = async (): Promise<void> => {
    setIsConnecting(true);
    setError('');
    
    try {
      console.log('Attempting Solflare connection...');
      
      let publicKey: string;
      
      try {
        // Try primary method first
        publicKey = await connectToSolflare();
        console.log('Primary method successful:', publicKey);
      } catch (primaryError) {
        console.log('Primary method failed, trying alternative...', primaryError);
        try {
          // Try alternative method with events
          publicKey = await connectToSolflareWithEvents();
          console.log('Alternative method successful:', publicKey);
        } catch (secondaryError) {
          console.error('Both methods failed:', secondaryError);
          throw secondaryError;
        }
      }
      
      const walletInfo: WalletInfo = {
        address: publicKey,
        type: 'solflare',
        isConnected: true,
      };
      
      setWallet(walletInfo);
      localStorage.setItem('wallet_address', publicKey);
      localStorage.setItem('wallet_type', 'solflare');
      
      // Dispatch custom event for route protection
      window.dispatchEvent(new CustomEvent('walletConnected', { 
        detail: { type: 'solflare', address: publicKey } 
      }));
      
      console.log('Successfully stored Solflare wallet info');
      
    } catch (err: any) {
      console.error('Solflare connection error:', err);
      setError(err.message || 'Failed to connect to Solflare');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectBackpack = async (): Promise<void> => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Backpack uses similar API to Solflare
      if (!window.solflare?.isSolflare) {
        throw new Error('Backpack wallet not found. Please install Backpack extension.');
      }

      const response = await window.solflare.connect();
      
      if (response?.publicKey) {
        const publicKey = response.publicKey;
        const walletInfo: WalletInfo = {
          address: publicKey,
          type: 'backpack',
          isConnected: true,
        };
        
        setWallet(walletInfo);
        localStorage.setItem('wallet_address', publicKey);
        localStorage.setItem('wallet_type', 'backpack');
        
        // Dispatch custom event for route protection
        window.dispatchEvent(new CustomEvent('walletConnected', { 
          detail: { type: 'backpack', address: publicKey } 
        }));
      } else {
        throw new Error('Failed to connect to Backpack wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Backpack');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };


  const disconnect = async (): Promise<void> => {
    try {
      if (wallet?.type === 'phantom' && window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      } else if (wallet?.type === 'solflare' && window.solflare) {
        await window.solflare.disconnect();
      } else if (wallet?.type === 'backpack' && window.solflare) {
        await window.solflare.disconnect();
      }

      setWallet(null);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('daemon_token'); // Also remove auth token if exists

      // Dispatch custom event for route protection with redirect info
      window.dispatchEvent(new CustomEvent('walletDisconnected', {
        detail: { redirect: true }
      }));
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  const signMessage = async (message: string): Promise<Uint8Array> => {
    if (!wallet?.isConnected) {
      throw new Error('No wallet connected');
    }

    const messageBytes = new TextEncoder().encode(message);
    
    try {
      let signature: Uint8Array;
      
      if (wallet.type === 'phantom' && window.phantom?.solana) {
        const response = await window.phantom.solana.signMessage(messageBytes);
        signature = response.signature;
      } else if ((wallet.type === 'solflare' || wallet.type === 'backpack') && window.solflare) {
        const response = await window.solflare.signMessage(messageBytes);
        signature = response.signature;
      } else {
        throw new Error('Wallet not available for signing');
      }
      
      return signature;
    } catch (err: any) {
      console.error('Sign message error:', err);
      setError(err.message || 'Failed to sign message');
      throw err;
    }
  };

  const getWalletProvider = () => {
    if (wallet?.type === 'phantom') {
      return window.phantom?.solana;
    } else if (wallet?.type === 'solflare' || wallet?.type === 'backpack') {
      return window.solflare;
    }
    return null;
  };

  return {
    wallet,
    isConnecting,
    error,
    connectPhantom,
    connectSolflare,
    connectBackpack,
    disconnect,
    signMessage,
    getWalletProvider,
    clearError: () => setError(''),
  };
}
