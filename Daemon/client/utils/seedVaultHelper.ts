/**
 * Seed Vault Helper
 * Interface for interacting with Seed Vault via Android WebView bridge
 * Seed Vault is a key custody solution for Solana Mobile devices (Saga phones)
 * 
 * Reference: https://github.com/solana-mobile/seed-vault-sdk
 */

export interface SeedVaultStatus {
  available: boolean;
}

export interface SeedVaultSeed {
  seedId: number;
  name: string;
}

export interface SeedVaultAccount {
  publicKey: string; // Base64 encoded
  name?: string;
  derivationPath: string;
}

export interface SeedVaultAuthResult {
  success: boolean;
  seedId?: number;
  seedName?: string;
  error?: string;
}

export interface SeedVaultPublicKeyResult {
  success: boolean;
  publicKey?: string; // Base64 encoded
  derivationPath?: string;
  error?: string;
}

export interface SeedVaultSignResult {
  success: boolean;
  signature?: string; // Base64 encoded
  error?: string;
}

/**
 * Check if Android interface is available
 */
function isAndroidAvailable(): boolean {
  return typeof (window as any).Android !== 'undefined';
}

/**
 * Seed Vault API wrapper class
 */
export class SeedVaultAPI {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Seed Vault status events
    window.addEventListener('seedVaultStatus', ((e: CustomEvent<SeedVaultStatus>) => {
      this.dispatch('status', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultHasSeeds', ((e: CustomEvent<{ hasSeeds: boolean }>) => {
      this.dispatch('hasSeeds', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultSeeds', ((e: CustomEvent<{ seeds: SeedVaultSeed[] }>) => {
      this.dispatch('seeds', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultAccounts', ((e: CustomEvent<{ seedId: number; accounts: SeedVaultAccount[] }>) => {
      this.dispatch('accounts', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultAuthResult', ((e: CustomEvent<SeedVaultAuthResult>) => {
      this.dispatch('authResult', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultPublicKeyResult', ((e: CustomEvent<SeedVaultPublicKeyResult>) => {
      this.dispatch('publicKeyResult', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultSignResult', ((e: CustomEvent<SeedVaultSignResult>) => {
      this.dispatch('signResult', e.detail);
    }) as EventListener);

    window.addEventListener('seedVaultError', ((e: CustomEvent<{ error: string }>) => {
      this.dispatch('error', e.detail);
    }) as EventListener);
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
  on(event: 'status' | 'hasSeeds' | 'seeds' | 'accounts' | 'authResult' | 'publicKeyResult' | 'signResult' | 'error', callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Check if Seed Vault is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (!isAndroidAvailable()) {
      return false;
    }

    return new Promise((resolve) => {
      const unsubscribe = this.on('status', (data: SeedVaultStatus) => {
        unsubscribe();
        resolve(data.available);
      });

      try {
        (window as any).Android.seedVaultIsAvailable();
        // Timeout after 2 seconds
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

  /**
   * Check if any seeds are authorized
   */
  async hasAuthorizedSeeds(): Promise<boolean> {
    if (!isAndroidAvailable()) {
      return false;
    }

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

  /**
   * Request authorization to access a seed
   */
  async authorizeSeed(): Promise<SeedVaultAuthResult> {
    if (!isAndroidAvailable()) {
      return { success: false, error: 'Seed Vault not available' };
    }

    return new Promise((resolve) => {
      const unsubscribe = this.on('authResult', (data: SeedVaultAuthResult) => {
        unsubscribe();
        resolve(data);
      });

      const errorUnsubscribe = this.on('error', (data: { error: string }) => {
        errorUnsubscribe();
        unsubscribe();
        resolve({ success: false, error: data.error });
      });

      try {
        (window as any).Android.seedVaultAuthorizeSeed();
        // Increased timeout to 2 minutes for Seed Vault authorization (user needs time to create seed if needed)
        setTimeout(() => {
          errorUnsubscribe();
          unsubscribe();
          resolve({ success: false, error: 'Authorization timeout. Please make sure Seed Vault Simulator is installed and try again.' });
        }, 120000); // 2 minute timeout for user interaction
      } catch (e) {
        errorUnsubscribe();
        unsubscribe();
        resolve({ success: false, error: (e as Error).message });
      }
    });
  }

  /**
   * Get authorized seeds
   */
  async getAuthorizedSeeds(): Promise<SeedVaultSeed[]> {
    if (!isAndroidAvailable()) {
      return [];
    }

    return new Promise((resolve) => {
      const unsubscribe = this.on('seeds', (data: { seeds: SeedVaultSeed[] }) => {
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

  /**
   * Get accounts for a seed
   */
  async getAccounts(seedId: number): Promise<SeedVaultAccount[]> {
    if (!isAndroidAvailable()) {
      return [];
    }

    return new Promise((resolve) => {
      const unsubscribe = this.on('accounts', (data: { seedId: number; accounts: SeedVaultAccount[] }) => {
        unsubscribe();
        if (data.seedId === seedId) {
          resolve(data.accounts);
        }
      });

      const errorUnsubscribe = this.on('error', () => {
        errorUnsubscribe();
        unsubscribe();
        resolve([]);
      });

      try {
        (window as any).Android.seedVaultGetAccounts(seedId.toString());
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
}

// Export singleton instance
export const seedVault = new SeedVaultAPI();

