// Sign In With Solana (SIWS) hook using Mobile Wallet Adapter
// Combines authorization and signing in one secure flow

import { useState, useEffect } from 'react';
import { mwa, DEFAULT_APP_IDENTITY, type AuthorizationResult } from '@/utils/mobileWalletAdapter';
import { createSIWSInput, verifySIWS, getAddressFromSIWS } from '@/utils/siwsHelper';
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";

interface WalletInfo {
  address: string;
  type: 'phantom' | 'solflare' | 'mwa';
  isConnected: boolean;
  siwsOutput?: SolanaSignInOutput;
}

export function useSIWSWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [authResult, setAuthResult] = useState<AuthorizationResult | null>(null);
  const [siwsOutput, setSiwsOutput] = useState<SolanaSignInOutput | null>(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const address = localStorage.getItem('wallet_address');
    const type = localStorage.getItem('wallet_type') as WalletInfo['type'];
    
    if (address && type && (type === 'mwa' || type === 'phantom' || type === 'solflare')) {
      setWallet({
        address,
        type,
        isConnected: true,
      });
    }
  }, []);

  /**
   * Sign In with Solana using MWA
   * This combines authorization + message signing in one secure flow
   */
  const signIn = async (cluster: string = 'solana:mainnet-beta'): Promise<SolanaSignInOutput> => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!mwa.isAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      console.log('Starting SIWS with MWA...');
      
      // Create SIWS input
      const siwsInput = createSIWSInput();
      console.log('SIWS input:', siwsInput);
      
      // Authorize with SIWS payload
      const result = await mwa.authorize({
        cluster,
        identity: DEFAULT_APP_IDENTITY,
        signInInput: siwsInput, // Pass SIWS input for sign-in
      });

      console.log('MWA authorization with SIWS successful:', result);
      
      // Check if sign_in_result is present (SIWS output)
      // SIWS result can be in sign_in_result field or embedded in accounts
      let siwsOutput: SolanaSignInOutput | null = null;
      
      if (result.sign_in_result) {
        siwsOutput = result.sign_in_result as SolanaSignInOutput;
      } else if (result.accounts && result.accounts[0] && 'signature' in result.accounts[0]) {
        // Fallback: check if account has SIWS data
        console.warn('SIWS result not in expected format, checking accounts...');
      }
      
      if (siwsOutput) {
        // Verify SIWS signature
        if (!verifySIWS(siwsInput, siwsOutput)) {
          throw new Error('SIWS signature verification failed');
        }
        
        // Extract address
        const address = getAddressFromSIWS(siwsOutput);
        if (!address) {
          throw new Error('Failed to extract address from SIWS output');
        }
        
        const walletInfo: WalletInfo = {
          address,
          type: 'mwa',
          isConnected: true,
          siwsOutput: output,
        };
        
        setWallet(walletInfo);
        setAuthResult(result);
        setSiwsOutput(output);
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_type', 'mwa');
        localStorage.setItem('mwa_auth_token', result.auth_token || '');
        localStorage.setItem('siws_signature', JSON.stringify({
          signature: Array.from(output.signature),
          signedMessage: Array.from(output.signedMessage),
        }));
        
        // Dispatch custom event for route protection
        window.dispatchEvent(new CustomEvent('walletConnected', { 
          detail: { type: 'mwa', address, siws: true } 
        }));
        
        return output;
      } else if (result.accounts && result.accounts.length > 0) {
        // Fallback: regular authorization without SIWS
        console.warn('SIWS not available, using regular authorization');
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
        
        window.dispatchEvent(new CustomEvent('walletConnected', { 
          detail: { type: 'mwa', address } 
        }));
        
        // For seed vault, we still need to sign a message
        // Return a mock output for now
        throw new Error('SIWS not supported by wallet. Please use regular sign message flow.');
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (err: any) {
      console.error('SIWS connection error:', err);
      setError(err.message || 'Failed to sign in with Solana');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Regular connect (without SIWS) - fallback method
   */
  const connect = async (cluster: string = 'solana:mainnet-beta'): Promise<void> => {
    setIsConnecting(true);
    setError('');
    
    try {
      if (!mwa.isAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      console.log('Starting MWA authorization (non-SIWS)...');
      
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
      setSiwsOutput(null);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('mwa_auth_token');
      localStorage.removeItem('siws_signature');
      
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
    siwsOutput,
    signIn, // SIWS method
    connect, // Regular connect (fallback)
    signMessage,
    disconnect,
    isAvailable: mwa.isAvailable(),
    isAuthorized: mwa.isAuthorized(),
    clearError: () => setError(''),
  };
}

