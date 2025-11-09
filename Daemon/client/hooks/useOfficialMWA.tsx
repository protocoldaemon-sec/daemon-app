// Hook untuk menggunakan official MWA library dengan WebView Android adapter
import { useState, useEffect } from 'react';
import { transactWithAndroid, isMWAAvailable, type Web3MobileWallet } from '@/utils/mwaTransactAdapter';
import { APP_IDENTITY } from '@/utils/appIdentity';

export interface WalletInfo {
  address: string;
  type: 'mwa';
  isConnected: boolean;
  authToken?: string;
}

export function useOfficialMWA() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Load wallet from localStorage on mount
  useEffect(() => {
    const address = localStorage.getItem('wallet_address');
    const authToken = localStorage.getItem('mwa_auth_token');
    
    if (address && authToken) {
      setWallet({
        address,
        type: 'mwa',
        isConnected: true,
        authToken,
      });
    }
  }, []);

  /**
   * Connect wallet using official MWA transact API
   * Supports auth_token for reconnection
   */
  const connect = async (cluster: string = 'solana:mainnet-beta') => {
    setIsConnecting(true);
    setError('');

    try {
      if (!isMWAAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      // Try to get stored auth_token for faster reconnection
      const storedAuthToken = localStorage.getItem('mwa_auth_token') || undefined;
      
      console.log('Connecting with official MWA library...', storedAuthToken ? '(with stored auth_token)' : '(new authorization)');

      const result = await transactWithAndroid(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          chain: cluster,
          identity: APP_IDENTITY,
          auth_token: storedAuthToken, // Use stored token if available for faster connection
        });

        return authResult;
      });

      console.log('MWA authorization result:', result);

      if (result.accounts && result.accounts.length > 0) {
        const address = result.accounts[0].address;
        const authToken = result.auth_token;

        const walletInfo: WalletInfo = {
          address,
          type: 'mwa',
          isConnected: true,
          authToken,
        };

        setWallet(walletInfo);
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_type', 'mwa');
        if (authToken) {
          localStorage.setItem('mwa_auth_token', authToken);
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { type: 'mwa', address },
        }));

        return result;
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

  /**
   * Sign in with Solana (SIWS) using official MWA
   * Based on: https://docs.solanamobile.com/reference/typescript/mobile-wallet-adapter#transact
   * and https://github.com/phantom/sign-in-with-solana
   */
  const signIn = async (cluster: string = 'solana:mainnet-beta', signInPayload?: any) => {
    setIsConnecting(true);
    setError('');

    try {
      if (!isMWAAvailable()) {
        throw new Error('Mobile Wallet Adapter not available on this device');
      }

      // Try to get stored auth_token for faster reconnection
      const storedAuthToken = localStorage.getItem('mwa_auth_token') || undefined;
      
      console.log('Signing in with SIWS via official MWA...', storedAuthToken ? '(with stored auth_token)' : '(new authorization)');

      // Use official transact pattern for SIWS
      const signInResult = await transactWithAndroid(async (wallet: Web3MobileWallet) => {
        const authorizationResult = await wallet.authorize({
          chain: cluster,
          identity: APP_IDENTITY,
          sign_in_payload: signInPayload || {
            domain: typeof window !== 'undefined' ? window.location.hostname : 'daemonprotocol.com',
            statement: 'Sign into Daemon Seeker App',
            uri: typeof window !== 'undefined' ? window.location.origin : 'https://daemonprotocol.com',
          },
          auth_token: storedAuthToken, // Use stored token if available
        });

        // Return sign_in_result if available
        return authorizationResult.sign_in_result;
      });

      console.log('SIWS sign-in result:', signInResult);

      if (signInResult) {
        // Get address from sign_in_result using proper helper
        // Import helper to extract address correctly
        const { getAddressFromSIWS } = await import('@/utils/siwsHelper');
        const address = getAddressFromSIWS(signInResult);

        if (!address) {
          throw new Error('No address in sign_in_result');
        }

        // Get auth token from the authorization (need to get it separately)
        // For now, we'll store the sign_in_result and address
        const walletInfo: WalletInfo = {
          address,
          type: 'mwa',
          isConnected: true,
        };

        setWallet(walletInfo);
        localStorage.setItem('wallet_address', address);
        localStorage.setItem('wallet_type', 'mwa');
        
        // Store SIWS result for verification
        localStorage.setItem('siws_signature', JSON.stringify({
          signature: Array.from(signInResult.signature),
          signed_message: Array.from(signInResult.signed_message),
          account: signInResult.account,
        }));

        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { type: 'mwa', address, siws: true },
        }));

        return signInResult;
      } else {
        throw new Error('No sign_in_result returned from wallet');
      }
    } catch (err: any) {
      console.error('SIWS error:', err);
      setError(err.message || 'Failed to sign in with Solana');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Disconnect wallet (deauthorize)
   * Following official MWA pattern: https://docs.solanamobile.com/reference/typescript/mobile-wallet-adapter#deauthorize
   */
  const disconnect = async () => {
    try {
      const previouslyStoredAuthToken = wallet?.authToken || localStorage.getItem('mwa_auth_token');
      
      if (!previouslyStoredAuthToken) {
        // No auth token to deauthorize, just clear local state
        setWallet(null);
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('wallet_type');
        localStorage.removeItem('mwa_auth_token');
        localStorage.removeItem('siws_signature');
        
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
        return;
      }

      // Deauthorize using official MWA pattern
      await transactWithAndroid(async (wallet: Web3MobileWallet) => {
        // Pass in the prior auth token to invalidate it
        await wallet.deauthorize({ auth_token: previouslyStoredAuthToken });
      });

      // Clear local state after successful deauthorization
      setWallet(null);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('mwa_auth_token');
      localStorage.removeItem('siws_signature');

      window.dispatchEvent(new CustomEvent('walletDisconnected'));
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect wallet');
      
      // Even if deauthorize fails, clear local state
      setWallet(null);
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_type');
      localStorage.removeItem('mwa_auth_token');
      localStorage.removeItem('siws_signature');
    }
  };

  /**
   * Get wallet capabilities
   */
  const getCapabilities = async () => {
    try {
      return await transactWithAndroid(async (wallet: Web3MobileWallet) => {
        return await wallet.getCapabilities();
      });
    } catch (err: any) {
      console.error('Get capabilities error:', err);
      throw err;
    }
  };

  return {
    wallet,
    isConnecting,
    error,
    connect,
    signIn,
    disconnect,
    getCapabilities,
    isAvailable: isMWAAvailable(),
    isAuthorized: wallet !== null,
    clearError: () => setError(''),
  };
}

