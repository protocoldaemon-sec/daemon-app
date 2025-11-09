/**
 * Enhanced Mobile Wallet Adapter for Daemon Project
 * Combines official Solana Mobile Wallet Adapter patterns with custom Android bridge
 */

import { createDefaultAuthorizationResultCache, createDefaultAddressSelector } from '@solana-mobile/wallet-adapter-mobile';
import type { AuthorizationResult, AppIdentity } from '@solana-mobile/mobile-wallet-adapter-protocol';
import type { SolanaSignInInput, SolanaSignInOutput } from '@solana/wallet-standard-features';
import { mobileWalletLogger } from './mobileWalletLogger';

// Enhanced types based on official patterns
export interface Chain {
  /** The namespace of the chain (e.g., 'solana') */
  namespace: string;
  /** The chain ID (e.g., 'mainnet', 'devnet') */
  chainId: string;
}

export interface Base64EncodedAddress {
  /** Base64-encoded address */
  address: string;
}

export interface Account {
  address: Base64EncodedAddress;
  label?: string;
  icon?: string;
  chains?: string[];
  features?: string[];
}

export interface EnhancedAuthorizationResult extends AuthorizationResult {
  accounts: Account[];
  auth_token?: string;
  wallet_uri_base?: string;
  sign_in_result?: SolanaSignInOutput;
  selectedAccount?: Account;
  chain?: Chain;
}

export interface MobileWalletConnectionOptions {
  chain?: Chain;
  cluster?: string; // For backward compatibility
  identity: AppIdentity;
  auth_token?: string;
  signInInput?: SolanaSignInInput;
  addressSelector?: (accounts: Account[]) => Promise<Account>;
  onWalletNotFound?: () => void;
}

export interface MobileWalletCapabilities {
  supportedFeatures: string[];
  supportedChains: string[];
  maxTransactionsPerRequest: number;
  supportsSignInWithSolana: boolean;
}

/**
 * Utility functions based on official patterns
 */
export class MobileWalletUtils {
  /**
   * Convert between Uint8Array and Base64 strings
   */
  static fromUint8Array(byteArray: Uint8Array): string {
    return window.btoa(String.fromCharCode.call(null, ...byteArray));
  }

  static toUint8Array(base64EncodedByteArray: string): Uint8Array {
    return new Uint8Array(
      window.atob(base64EncodedByteArray)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
  }

  /**
   * Check if running in a supported mobile environment
   */
  static getIsSupported(): boolean {
    return (
      // Check for Android environment
      typeof (window as any).Android !== 'undefined' ||
      // Check for iOS Safari
      (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) ||
      // Check for mobile Chrome
      (/Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent))
    );
  }

  /**
   * Get default Solana chains
   */
  static getSolanaChains(): Chain[] {
    return [
      { namespace: 'solana', chainId: 'mainnet-beta' },
      { namespace: 'solana', chainId: 'devnet' },
      { namespace: 'solana', chainId: 'testnet' },
    ];
  }

  /**
   * Create default app identity with fallbacks
   */
  static createDefaultAppIdentity(overrides?: Partial<AppIdentity>): AppIdentity {
    return {
      name: 'Daemon Seeker App',
      uri: typeof window !== 'undefined' ? window.location.origin : 'https://daemonprotocol.com',
      icon: '/favicon.ico',
      ...overrides,
    };
  }

  /**
   * Generate a unique session ID for tracking
   */
  static generateSessionId(): string {
    return `daemon_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Authorization cache implementation using official patterns
 */
export class DaemonAuthorizationCache {
  private cacheKey = 'daemon_mwa_auth_cache';
  private cache = createDefaultAuthorizationResultCache();

  async get(walletUri: string): Promise<EnhancedAuthorizationResult | null> {
    try {
      const cached = await this.cache.get(walletUri);
      return cached as EnhancedAuthorizationResult | null;
    } catch (error) {
      console.warn('Failed to get authorization from cache:', error);
      return null;
    }
  }

  async set(walletUri: string, result: EnhancedAuthorizationResult): Promise<void> {
    try {
      await this.cache.set(walletUri, result);
    } catch (error) {
      console.warn('Failed to cache authorization result:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cache.clear();
    } catch (error) {
      console.warn('Failed to clear authorization cache:', error);
    }
  }
}

/**
 * Address selector with support for multiple accounts
 */
export class DaemonAddressSelector {
  /**
   * Default implementation - select first account
   */
  static async selectDefaultAddress(accounts: Account[]): Promise<Account> {
    if (accounts.length === 0) {
      throw new Error('No accounts available for selection');
    }
    return accounts[0];
  }

  /**
   * Enhanced selection with user preference (if needed in future)
   */
  static async selectAddress(accounts: Account[], preferredAddress?: string): Promise<Account> {
    if (accounts.length === 0) {
      throw new Error('No accounts available for selection');
    }

    // If preferred address is provided and exists, select it
    if (preferredAddress) {
      const preferred = accounts.find(account => account.address.address === preferredAddress);
      if (preferred) {
        return preferred;
      }
    }

    // Otherwise, select the first account
    return accounts[0];
  }
}

/**
 * Enhanced error types for better error handling
 */
export class MobileWalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MobileWalletError';
  }
}

export class AuthorizationTimeoutError extends MobileWalletError {
  constructor(timeout: number) {
    super(`Authorization timed out after ${timeout}ms`, 'AUTHORIZATION_TIMEOUT', { timeout });
    this.name = 'AuthorizationTimeoutError';
  }
}

export class WalletNotFoundError extends MobileWalletError {
  constructor() {
    super('No compatible wallet found', 'WALLET_NOT_FOUND');
    this.name = 'WalletNotFoundError';
  }
}

export class TransactionSignError extends MobileWalletError {
  constructor(message: string, public transactionId?: string) {
    super(`Transaction signing failed: ${message}`, 'TRANSACTION_SIGN_ERROR', { transactionId });
    this.name = 'TransactionSignError';
  }
}

/**
 * Enhanced Mobile Wallet Adapter with official patterns
 */
export class EnhancedMobileWalletAdapter {
  private static instance: EnhancedMobileWalletAdapter;
  private authToken: string | null = null;
  private authorizedAccounts: EnhancedAuthorizationResult | null = null;
  private authorizationCache = new DaemonAuthorizationCache();
  private capabilities: MobileWalletCapabilities | null = null;
  private sessionId: string = MobileWalletUtils.generateSessionId();

  static getInstance(): EnhancedMobileWalletAdapter {
    if (!EnhancedMobileWalletAdapter.instance) {
      EnhancedMobileWalletAdapter.instance = new EnhancedMobileWalletAdapter();
    }
    return EnhancedMobileWalletAdapter.instance;
  }

  /**
   * Check if MWA is available
   */
  isAvailable(): boolean {
    const isSupported = MobileWalletUtils.getIsSupported();
    const hasAndroid = typeof (window as any).Android !== 'undefined';
    const hasMWA = typeof (window as any).Android?.mwaAuthorize === 'function';
    const available = isSupported && hasAndroid && hasMWA;

    mobileWalletLogger.debug('mwa', 'MWA availability check', {
      isSupported,
      hasAndroid,
      hasMWA,
      available
    });

    return available;
  }

  /**
   * Get wallet capabilities
   */
  async getCapabilities(): Promise<MobileWalletCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    if (!this.isAvailable()) {
      throw new WalletNotFoundError();
    }

    // For now, return default capabilities
    this.capabilities = {
      supportedFeatures: [
        'solana:signMessage',
        'solana:signTransaction',
        'solana:signAndSendTransaction',
        'solana:signIn',
      ],
      supportedChains: ['solana:mainnet-beta', 'solana:devnet', 'solana:testnet'],
      maxTransactionsPerRequest: 10,
      supportsSignInWithSolana: true,
    };

    return this.capabilities;
  }

  /**
   * Enhanced authorization with official patterns
   */
  async authorize(options: MobileWalletConnectionOptions): Promise<EnhancedAuthorizationResult> {
    if (!this.isAvailable()) {
      throw new WalletNotFoundError();
    }

    const chain = options.chain || this.createChainFromCluster(options.cluster || 'solana:mainnet-beta');
    const addressSelector = options.addressSelector || DaemonAddressSelector.selectDefaultAddress;

    // Check cache first
    const walletUri = this.getWalletUri();
    if (walletUri) {
      const cached = await this.authorizationCache.get(walletUri);
      if (cached) {
        this.authorizedAccounts = cached;
        this.authToken = cached.auth_token || null;
        return cached;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const identityJson = JSON.stringify(options.identity);
        const cluster = `${chain.namespace}:${chain.chainId}`;
        const signInInputJson = options.signInInput ? JSON.stringify(options.signInInput) : null;

        // Enhanced event handlers
        const handleMWAResult = async (event: CustomEvent) => {
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);

          const result = event.detail;
          if (result.error) {
            reject(new MobileWalletError(result.error, 'AUTHORIZATION_ERROR'));
          } else {
            // Convert to enhanced format
            const enhancedResult: EnhancedAuthorizationResult = {
              ...result,
              accounts: result.accounts || [],
              selectedAccount: await addressSelector(result.accounts || []),
              chain,
            };

            this.authorizedAccounts = enhancedResult;
            this.authToken = result.auth_token || null;

            // Cache the result
            if (walletUri) {
              await this.authorizationCache.set(walletUri, enhancedResult);
            }

            resolve(enhancedResult);
          }
        };

        const handleMWAError = (event: CustomEvent) => {
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);
          reject(new MobileWalletError(event.detail.error || 'Authorization failed', 'AUTHORIZATION_ERROR'));
        };

        window.addEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
        window.addEventListener('mwaError', handleMWAError as EventListener);

        // Enhanced visibility change handling
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log(`[${this.sessionId}] App visible again, checking for MWA result...`);
            setTimeout(() => {
              if (document.visibilityState === 'visible') {
                console.log(`[${this.sessionId}] Still visible, MWA might have completed`);
              }
            }, 1000);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Call native Android MWA interface with enhanced logging
        console.log(`[${this.sessionId}] Calling Android.mwaAuthorize with:`, {
          identityJson,
          cluster,
          hasSignInInput: !!signInInputJson
        });

        if (signInInputJson && typeof (window as any).Android.mwaAuthorizeWithSIWS === 'function') {
          (window as any).Android.mwaAuthorizeWithSIWS(identityJson, cluster, signInInputJson);
        } else {
          (window as any).Android.mwaAuthorize(identityJson, cluster);
        }

        // Enhanced timeout handling
        const timeoutId = setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);
          reject(new AuthorizationTimeoutError(30000));
        }, 30000);

        // Enhanced cleanup
        const originalHandleMWAResult = handleMWAResult;
        const newHandleMWAResult = (event: CustomEvent) => {
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          originalHandleMWAResult(event);
        };

        const originalHandleMWAError = handleMWAError;
        const newHandleMWAError = (event: CustomEvent) => {
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          originalHandleMWAError(event);
        };

        window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
        window.removeEventListener('mwaError', handleMWAError as EventListener);
        window.addEventListener('mwaAuthorizationResult', newHandleMWAResult as EventListener);
        window.addEventListener('mwaError', newHandleMWAError as EventListener);

      } catch (error: any) {
        reject(new MobileWalletError(error.message, 'AUTHORIZATION_ERROR', error));
      }
    });
  }

  /**
   * Enhanced message signing
   */
  async signMessage(message: Uint8Array, address?: string): Promise<Uint8Array> {
    if (!this.isAvailable()) {
      throw new WalletNotFoundError();
    }

    if (!this.authorizedAccounts || !this.authorizedAccounts.selectedAccount) {
      throw new MobileWalletError('Not authorized. Call authorize() first.', 'NOT_AUTHORIZED');
    }

    return new Promise((resolve, reject) => {
      try {
        const messageBase64 = MobileWalletUtils.fromUint8Array(message);
        const targetAddress = address || this.authorizedAccounts!.selectedAccount!.address.address;

        const handleSignResult = (event: CustomEvent) => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);

          const result = event.detail;
          if (result.error) {
            reject(new TransactionSignError(result.error));
          } else {
            const signatureBytes = MobileWalletUtils.toUint8Array(result.signature);
            resolve(signatureBytes);
          }
        };

        const handleSignError = (event: CustomEvent) => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);
          reject(new TransactionSignError(event.detail.error || 'Sign message failed'));
        };

        window.addEventListener('mwaSignResult', handleSignResult as EventListener);
        window.addEventListener('mwaError', handleSignError as EventListener);

        (window as any).Android.mwaSignMessage(messageBase64, targetAddress);

        setTimeout(() => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);
          reject(new TransactionSignError('Sign message timeout'));
        }, 30000);

      } catch (error: any) {
        reject(new TransactionSignError(error.message));
      }
    });
  }

  /**
   * Enhanced deauthorization
   */
  async deauthorize(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    if (this.authToken) {
      try {
        (window as any).Android.mwaDeauthorize(this.authToken);
        this.authToken = null;
        this.authorizedAccounts = null;
        await this.authorizationCache.clear();
      } catch (error) {
        console.error('Deauthorization error:', error);
        throw new MobileWalletError('Failed to deauthorize wallet', 'DEAUTHORIZATION_ERROR');
      }
    }
  }

  /**
   * Get current authorization state
   */
  getAuthorizationState(): EnhancedAuthorizationResult | null {
    return this.authorizedAccounts;
  }

  /**
   * Check if wallet is authorized
   */
  isAuthorized(): boolean {
    return this.authorizedAccounts !== null &&
           this.authorizedAccounts.accounts.length > 0 &&
           this.authorizedAccounts.selectedAccount !== undefined;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): Chain[] {
    return MobileWalletUtils.getSolanaChains();
  }

  // Private helper methods
  private createChainFromCluster(cluster: string): Chain {
    const [namespace, chainId] = cluster.split(':');
    return {
      namespace: namespace || 'solana',
      chainId: chainId || 'mainnet-beta',
    };
  }

  private getWalletUri(): string | null {
    return this.authorizedAccounts?.wallet_uri_base || null;
  }
}

// Export singleton instance and utilities
export const enhancedMWA = EnhancedMobileWalletAdapter.getInstance();
export const DEFAULT_APP_IDENTITY = MobileWalletUtils.createDefaultAppIdentity();
export const DEFAULT_CHAINS = MobileWalletUtils.getSolanaChains();