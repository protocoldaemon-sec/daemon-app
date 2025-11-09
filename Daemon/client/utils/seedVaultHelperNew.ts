/**
 * Seed Vault Helper
 * Interface for interacting with Seed Vault using @solana-mobile/seed-vault-lib
 * Seed Vault is a key custody solution for Solana Mobile devices (Saga phones)
 *
 * Reference: https://github.com/solana-mobile/seed-vault-sdk
 */

// Try to import SeedVault library with fallback for web environment
let SeedVault: any;
let PermissionsAndroid: any;
let isInitialized = false;

async function initializeSeedVault() {
  if (isInitialized) return;

  // Only attempt to load in Android environment
  const isAndroid = typeof window !== 'undefined' &&
                   (window.Android ||
                    (/android/i.test(navigator.userAgent) &&
                     typeof Capacitor !== 'undefined' &&
                     Capacitor.getPlatform() === 'android'));

  if (!isAndroid) {
    console.log('SeedVault library not available in this environment, using mock implementation');
    // Use mock implementation for non-Android environments
    SeedVault = {
      isSeedVaultAvailable: async () => false,
      hasUnauthorizedSeeds: async () => false,
      getAuthorizedSeeds: async () => [],
      authorizeNewSeed: async () => { throw new Error('SeedVault not available in this environment'); },
      getUserWallets: async () => [],
      getPublicKey: async () => { throw new Error('SeedVault not available in this environment'); },
      signMessage: async () => { throw new Error('SeedVault not available in this environment'); },
      signTransaction: async () => { throw new Error('SeedVault not available in this environment'); },
    };
    PermissionsAndroid = {
      check: async () => false,
      request: async () => PermissionsAndroid.RESULTS.DENIED,
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied'
      }
    };
    isInitialized = true;
    return;
  }

  try {
    console.log('Loading SeedVault library for Android environment...');
    // Import with error handling for mobile
    const seedVaultModule = await import("@solana-mobile/seed-vault-lib");
    SeedVault = seedVaultModule.SeedVault;
    PermissionsAndroid = seedVaultModule.PermissionsAndroid;
    console.log('SeedVault library loaded successfully');
  } catch (error) {
    console.warn('Failed to load SeedVault library, using mock implementation:', error);
    // Fallback to mock implementation
    SeedVault = {
      isSeedVaultAvailable: async () => false,
      hasUnauthorizedSeeds: async () => false,
      getAuthorizedSeeds: async () => [],
      authorizeNewSeed: async () => { throw new Error('SeedVault library failed to load'); },
      getUserWallets: async () => [],
      getPublicKey: async () => { throw new Error('SeedVault library failed to load'); },
      signMessage: async () => { throw new Error('SeedVault library failed to load'); },
      signTransaction: async () => { throw new Error('SeedVault library failed to load'); },
    };
    PermissionsAndroid = {
      check: async () => false,
      request: async () => PermissionsAndroid.RESULTS.DENIED,
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied'
      }
    };
  }

  isInitialized = true;
}

// Initialize immediately
initializeSeedVault();

export interface SeedVaultSeed {
  name: string;
  authToken: number;
}

export interface SeedVaultAccount {
  name: string;
  publicKeyEncoded: string;
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
 * Seed Vault API wrapper class using official library
 */
export class SeedVaultAPI {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    // Note: The official library doesn't provide event listeners in the same way
    // We'll use React hooks for state management instead
  }

  /**
   * Check if Seed Vault is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const available = await SeedVault.isSeedVaultAvailable(true);
      return available;
    } catch (e) {
      console.error('Error checking Seed Vault availability:', e);
      return false;
    }
  }

  /**
   * Check if any seeds are authorized
   */
  async hasAuthorizedSeeds(): Promise<boolean> {
    try {
      const hasSeeds = await SeedVault.hasUnauthorizedSeeds();
      const authorizedSeeds = await SeedVault.getAuthorizedSeeds();
      return authorizedSeeds.length > 0;
    } catch (e) {
      console.error('Error checking authorized seeds:', e);
      return false;
    }
  }

  /**
   * Request authorization to access a seed
   */
  async authorizeSeed(): Promise<SeedVaultAuthResult> {
    try {
      const result = await SeedVault.authorizeNewSeed();
      return {
        success: true,
        seedId: result.authToken,
        seedName: 'New Seed'
      };
    } catch (e) {
      console.error('Error authorizing seed:', e);
      return {
        success: false,
        error: (e as Error).message || 'Failed to authorize seed'
      };
    }
  }

  /**
   * Get authorized seeds
   */
  async getAuthorizedSeeds(): Promise<SeedVaultSeed[]> {
    try {
      const seeds = await SeedVault.getAuthorizedSeeds();
      return seeds.map(seed => ({
        name: seed.name,
        authToken: seed.authToken
      }));
    } catch (e) {
      console.error('Error getting authorized seeds:', e);
      return [];
    }
  }

  /**
   * Get accounts for a seed
   */
  async getAccounts(authToken: number): Promise<SeedVaultAccount[]> {
    try {
      const accounts = await SeedVault.getUserWallets(authToken);
      return accounts.map(account => ({
        name: account.name,
        publicKeyEncoded: account.publicKeyEncoded,
        derivationPath: account.derivationPath
      }));
    } catch (e) {
      console.error('Error getting accounts:', e);
      return [];
    }
  }

  /**
   * Get public key for account
   */
  async getPublicKey(authToken: number, derivationPath: string): Promise<SeedVaultPublicKeyResult> {
    try {
      const publicKey = await SeedVault.getPublicKey(authToken, derivationPath);
      return {
        success: true,
        publicKey: publicKey.publicKeyEncoded,
        derivationPath
      };
    } catch (e) {
      console.error('Error getting public key:', e);
      return {
        success: false,
        error: (e as Error).message || 'Failed to get public key'
      };
    }
  }

  /**
   * Sign message
   */
  async signMessage(authToken: number, derivationPath: string, message: Uint8Array): Promise<SeedVaultSignResult> {
    try {
      const result = await SeedVault.signMessage(authToken, derivationPath, message);
      return {
        success: true,
        signature: result.signatures[0] // Assuming single signature
      };
    } catch (e) {
      console.error('Error signing message:', e);
      return {
        success: false,
        error: (e as Error).message || 'Failed to sign message'
      };
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(authToken: number, derivationPath: string, transaction: Uint8Array): Promise<SeedVaultSignResult> {
    try {
      const result = await SeedVault.signTransaction(authToken, derivationPath, transaction);
      return {
        success: true,
        signature: result.signatures[0] // Assuming single signature
      };
    } catch (e) {
      console.error('Error signing transaction:', e);
      return {
        success: false,
        error: (e as Error).message || 'Failed to sign transaction'
      };
    }
  }

  /**
   * Check permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const hasPrivileged = await PermissionsAndroid.check(
        "com.solana.mobile.seedvault.PRIVILEGED_PERMISSION"
      );
      const hasNormal = await PermissionsAndroid.check(
        "com.solana.mobile.seedvault.PERMISSION"
      );
      return hasPrivileged || hasNormal;
    } catch (e) {
      console.error('Error checking permissions:', e);
      return false;
    }
  }

  /**
   * Request permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Try privileged permission first
      const privilegedResult = await PermissionsAndroid.request(
        "com.solana.mobile.seedvault.PRIVILEGED_PERMISSION",
        {
          title: 'Seed Vault Permission',
          message: 'This app needs privileged access to Seed Vault for enhanced functionality',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (privilegedResult === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      // Fall back to normal permission
      const normalResult = await PermissionsAndroid.request(
        "com.solana.mobile.seedvault.PERMISSION",
        {
          title: 'Seed Vault Permission',
          message: 'This app needs access to Seed Vault',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return normalResult === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.error('Error requesting permissions:', e);
      return false;
    }
  }
}

// Export singleton instance
export const seedVault = new SeedVaultAPI();