/**
 * Enhanced Seed Vault Helper
 * Combines existing WebView bridge with official SDK types and patterns
 * Compatible with both WebView (Capacitor) and React Native environments
 *
 * Reference: https://github.com/solana-mobile/seed-vault-sdk
 */

import { SeedVaultAPI, Seed, Account, SeedPublicKey, SigningRequest, SigningResult, SeedPurpose, DerivationPath } from './official-types';

// Re-export types from official SDK
export type {
  Seed,
  Account,
  SeedPublicKey,
  SigningRequest,
  SigningResult,
  SeedPurpose,
  DerivationPath,
  SeedVaultAPI
} from './official-types';

// Legacy types for backward compatibility
export interface SeedVaultStatus {
  available: boolean;
}

export interface SeedVaultAuthResult {
  success: boolean;
  seedId?: number;
  seedName?: string;
  authToken?: number;
  error?: string;
}

export interface SeedVaultSignResult {
  success: boolean;
  signature?: string; // Base64 encoded
  signatures?: string[]; // Base64 encoded array
  resolvedDerivationPaths?: string[];
  error?: string;
}

/**
 * Detect if running in React Native environment
 */
function isReactNative(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

/**
 * Detect if Android interface is available (Capacitor WebView)
 */
function isAndroidWebViewAvailable(): boolean {
  return typeof (window as any).Android !== 'undefined';
}

/**
 * Enhanced Seed Vault API wrapper
 * Supports both React Native and Capacitor WebView environments
 */
export class EnhancedSeedVaultAPI implements Partial<SeedVaultAPI> {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private isRN: boolean;
  private isWebView: boolean;

  constructor() {
    this.isRN = isReactNative();
    this.isWebView = isAndroidWebViewAvailable();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (this.isWebView) {
      this.setupWebViewEventListeners();
    } else if (this.isRN) {
      this.setupReactNativeEventListeners();
    }
  }

  private setupWebViewEventListeners() {
    // WebView event listeners (existing implementation)
    window.addEventListener('seedVaultStatus', ((e: CustomEvent<SeedVaultStatus>) => {
      this.dispatch('status', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultHasSeeds', ((e: CustomEvent<{ hasSeeds: boolean }>) => {
      this.dispatch('hasSeeds', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultSeeds', ((e: CustomEvent<{ seeds: Seed[] }>) => {
      this.dispatch('seeds', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultAccounts', ((e: CustomEvent<{ seedId: number; accounts: Account[] }>) => {
      this.dispatch('accounts', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultAuthResult', ((e: CustomEvent<SeedVaultAuthResult>) => {
      this.dispatch('authResult', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultSignResult', ((e: CustomEvent<SeedVaultSignResult>) => {
      this.dispatch('signResult', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultError', ((e: CustomEvent<{ error: string }>) => {
      this.dispatch('error', e.detail);
    }) as EventListener);
  }

  private setupReactNativeEventListeners() {
    // TODO: Implement React Native event listeners
    // This would use the NativeEventEmitter from the official SDK
    console.log('React Native Seed Vault event listeners not yet implemented');
  }

  private dispatch(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Subscribe to Seed Vault events
   */
  on(event: 'status' | 'hasSeeds' | 'seeds' | 'accounts' | 'authResult' | 'signResult' | 'error', callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  // === Seed Vault Availability API ===

  /**
   * Check if Seed Vault is available on this device
   */
  async isSeedVaultAvailable(allowSimulated: boolean = true): Promise<boolean> {
    if (this.isRN) {
      // React Native implementation would call the native module
      console.log('React Native isSeedVaultAvailable not yet implemented');
      return false;
    }

    if (this.isWebView) {
      return new Promise((resolve) => {
        const unsubscribe = this.on('status', (data: SeedVaultStatus) => {
          unsubscribe();
          resolve(data.available);
        });

        try {
          (window as any).Android.seedVaultIsAvailable();
          setTimeout(() => {
            unsubscribe();
            resolve(false);
          }, 2000);
        } catch (e) {
          unsubscribe();
          resolve(false);
        }
      });
    }

    return false;
  }

  // === Authorize Seed API ===

  /**
   * Check if any seeds are authorized
   */
  async hasAuthorizedSeeds(): Promise<boolean> {
    if (this.isRN) {
      console.log('React Native hasAuthorizedSeeds not yet implemented');
      return false;
    }

    if (this.isWebView) {
      return new Promise((resolve) => {
        const unsubscribe = this.on('hasSeeds', (data: { hasSeeds: boolean }) => {
          unsubscribe();
          resolve(data.hasSeeds);
        });

        try {
          (window as any).Android.seedVaultHasAuthorizedSeeds();
          setTimeout(() => {
            unsubscribe();
            resolve(false);
          }, 2000);
        } catch (e) {
          unsubscribe();
          resolve(false);
        }
      });
    }

    return false;
  }

  /**
   * Get authorized seeds
   */
  async getAuthorizedSeeds(): Promise<Seed[]> {
    if (this.isRN) {
      console.log('React Native getAuthorizedSeeds not yet implemented');
      return [];
    }

    if (this.isWebView) {
      return new Promise((resolve) => {
        const unsubscribe = this.on('seeds', (data: { seeds: Seed[] }) => {
          unsubscribe();
          resolve(data.seeds);
        });

        const errorUnsubscribe = this.on('error', () => {
          errorUnsubscribe();
          unsubscribe();
          resolve([]);
        });

        try {
          (window as any).Android.seedVaultGetAuthorizedSeeds();
          setTimeout(() => {
            errorUnsubscribe();
            unsubscribe();
            resolve([]);
          }, 5000);
        } catch (e) {
          errorUnsubscribe();
          unsubscribe();
          resolve([]);
        }
      });
    }

    return [];
  }

  /**
   * Request authorization to access a seed
   */
  async authorizeNewSeed(): Promise<{ authToken: number }> {
    if (this.isRN) {
      console.log('React Native authorizeNewSeed not yet implemented');
      throw new Error('Not implemented');
    }

    if (this.isWebView) {
      return new Promise((resolve, reject) => {
        const unsubscribe = this.on('authResult', (data: SeedVaultAuthResult) => {
          unsubscribe();
          if (data.success && data.authToken) {
            resolve({ authToken: data.authToken });
          } else {
            reject(new Error(data.error || 'Authorization failed'));
          }
        });

        const errorUnsubscribe = this.on('error', (data: { error: string }) => {
          errorUnsubscribe();
          unsubscribe();
          reject(new Error(data.error));
        });

        try {
          (window as any).Android.seedVaultAuthorizeSeed();
          setTimeout(() => {
            errorUnsubscribe();
            unsubscribe();
            reject(new Error('Authorization timeout. Please make sure Seed Vault Simulator is installed and try again.'));
          }, 120000);
        } catch (e) {
          errorUnsubscribe();
          unsubscribe();
          reject(new Error((e as Error).message));
        }
      });
    }

    throw new Error('Seed Vault not available');
  }

  // === Account API ===

  /**
   * Get accounts for a seed
   */
  async getAccounts(authToken: number, filterOnColumn?: string, value?: any): Promise<Account[]> {
    if (this.isRN) {
      console.log('React Native getAccounts not yet implemented');
      return [];
    }

    if (this.isWebView) {
      return new Promise((resolve) => {
        const unsubscribe = this.on('accounts', (data: { seedId: number; accounts: Account[] }) => {
          unsubscribe();
          if (data.seedId === authToken) {
            resolve(data.accounts);
          }
        });

        const errorUnsubscribe = this.on('error', () => {
          errorUnsubscribe();
          unsubscribe();
          resolve([]);
        });

        try {
          (window as any).Android.seedVaultGetAccounts(authToken.toString());
          setTimeout(() => {
            errorUnsubscribe();
            unsubscribe();
            resolve([]);
          }, 5000);
        } catch (e) {
          errorUnsubscribe();
          unsubscribe();
          resolve([]);
        }
      });
    }

    return [];
  }

  /**
   * Get user wallets for a seed
   */
  async getUserWallets(authToken: number): Promise<Account[]> {
    // This would call a specialized method to get only user wallets
    const accounts = await this.getAccounts(authToken);
    return accounts.filter(account => account.name && account.name.trim() !== '');
  }

  // === Public Key API ===

  /**
   * Get public key for a derivation path
   */
  async getPublicKey(authToken: number, derivationPath: DerivationPath): Promise<SeedPublicKey> {
    if (this.isRN) {
      console.log('React Native getPublicKey not yet implemented');
      throw new Error('Not implemented');
    }

    if (this.isWebView) {
      return new Promise((resolve, reject) => {
        // This would need to be implemented in the Android bridge
        (window as any).Android.seedVaultGetPublicKey(authToken.toString(), derivationPath);

        // For now, return a placeholder
        reject(new Error('WebView getPublicKey not yet implemented'));
      });
    }

    throw new Error('Seed Vault not available');
  }

  /**
   * Get multiple public keys
   */
  async getPublicKeys(authToken: number, derivationPaths: DerivationPath[]): Promise<SeedPublicKey[]> {
    const promises = derivationPaths.map(path => this.getPublicKey(authToken, path));
    return Promise.all(promises);
  }

  // === Signing API ===

  /**
   * Sign a transaction
   */
  async signTransaction(authToken: number, derivationPath: DerivationPath, transaction: string): Promise<SigningResult> {
    if (this.isRN) {
      console.log('React Native signTransaction not yet implemented');
      throw new Error('Not implemented');
    }

    if (this.isWebView) {
      return new Promise((resolve, reject) => {
        const unsubscribe = this.on('signResult', (data: SeedVaultSignResult) => {
          unsubscribe();
          if (data.success && data.signature) {
            resolve({
              signatures: [data.signature],
              resolvedDerivationPaths: data.resolvedDerivationPaths || [derivationPath]
            });
          } else {
            reject(new Error(data.error || 'Signing failed'));
          }
        });

        const errorUnsubscribe = this.on('error', (data: { error: string }) => {
          errorUnsubscribe();
          unsubscribe();
          reject(new Error(data.error));
        });

        try {
          (window as any).Android.seedVaultSignTransaction(authToken.toString(), derivationPath, transaction);
          setTimeout(() => {
            errorUnsubscribe();
            unsubscribe();
            reject(new Error('Signing timeout'));
          }, 60000);
        } catch (e) {
          errorUnsubscribe();
          unsubscribe();
          reject(new Error((e as Error).message));
        }
      });
    }

    throw new Error('Seed Vault not available');
  }

  /**
   * Sign multiple transactions
   */
  async signTransactions(authToken: number, signingRequests: SigningRequest[]): Promise<SigningResult[]> {
    const promises = signingRequests.map(request =>
      this.signTransaction(authToken, request.requestedSignatures[0], request.payload)
    );
    return Promise.all(promises);
  }

  /**
   * Sign a message
   */
  async signMessage(authToken: number, derivationPath: DerivationPath, message: string): Promise<SigningResult> {
    // Message signing is similar to transaction signing
    return this.signTransaction(authToken, derivationPath, message);
  }

  // === Utility Methods ===

  /**
   * Get the API instance type (React Native vs WebView)
   */
  getApiType(): 'react-native' | 'webview' | 'none' {
    if (this.isRN) return 'react-native';
    if (this.isWebView) return 'webview';
    return 'none';
  }

  /**
   * Check if the API is available
   */
  isAvailable(): boolean {
    return this.isRN || this.isWebView;
  }
}

// Export singleton instance
export const enhancedSeedVault = new EnhancedSeedVaultAPI();

// Export legacy instance for backward compatibility
export const seedVault = enhancedSeedVault;