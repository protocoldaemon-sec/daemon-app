/**
 * Seed Vault Helper for Capacitor (Android)
 * Interface for interacting with Seed Vault using Android Intents and Content Provider
 * This replaces the react-native library which is incompatible with web/React apps
 */

import { Capacitor } from '@capacitor/core';

export interface SeedVaultSeed {
  name: string;
  authToken: number;
}

export interface SeedVaultAccount {
  id: number;
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
 * Seed Vault API wrapper class using Android Intents
 */
export class SeedVaultAPI {
  private isAndroid: boolean;

  constructor() {
    this.isAndroid = Capacitor.getPlatform() === 'android';
  }

  /**
   * Check if Seed Vault is available on this device
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      // Check if SeedVault simulator app is installed
      const result = await this.invokeAndroidMethod('isSeedVaultAvailable', [true]);
      return result || false;
    } catch (e) {
      console.error('Error checking Seed Vault availability:', e);
      return false;
    }
  }

  /**
   * Check if any seeds are authorized
   */
  async hasAuthorizedSeeds(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      const seeds = await this.getAuthorizedSeeds();
      return seeds.length > 0;
    } catch (e) {
      console.error('Error checking authorized seeds:', e);
      return false;
    }
  }

  /**
   * Request authorization to access a seed
   */
  async authorizeSeed(): Promise<SeedVaultAuthResult> {
    if (!this.isAndroid) {
      return {
        success: false,
        error: 'Seed Vault only available on Android'
      };
    }

    try {
      // Launch Seed Vault authorization intent
      const result = await this.invokeAndroidIntent('com.solanamobile.seedvault.wallet.v1.ACTION_AUTHORIZE_SEED_ACCESS');

      if (result && result.authToken) {
        return {
          success: true,
          seedId: result.authToken,
          seedName: result.seedName || 'Authorized Seed'
        };
      }

      return {
        success: false,
        error: 'Failed to authorize seed'
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
    if (!this.isAndroid) {
      return [];
    }

    try {
      const result = await this.queryContentProvider('authorizedseeds');
      return result || [];
    } catch (e) {
      console.error('Error getting authorized seeds:', e);
      return [];
    }
  }

  /**
   * Get accounts for a seed
   */
  async getAccounts(authToken: number): Promise<SeedVaultAccount[]> {
    if (!this.isAndroid) {
      return [];
    }

    try {
      const result = await this.queryContentProvider('accounts', { authToken });
      return result || [];
    } catch (e) {
      console.error('Error getting accounts:', e);
      return [];
    }
  }

  /**
   * Get public key for account
   */
  async getPublicKey(authToken: number, derivationPath: string): Promise<SeedVaultPublicKeyResult> {
    if (!this.isAndroid) {
      return {
        success: false,
        error: 'Seed Vault only available on Android'
      };
    }

    try {
      // Launch public key request intent
      const result = await this.invokeAndroidIntent('com.solanamobile.seedvault.wallet.v1.ACTION_GET_PUBLIC_KEY', {
        authToken,
        derivationPath
      });

      if (result && result.publicKeyEncoded) {
        return {
          success: true,
          publicKey: result.publicKeyEncoded,
          derivationPath: result.derivationPath || derivationPath
        };
      }

      return {
        success: false,
        error: 'Failed to get public key'
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
    if (!this.isAndroid) {
      return {
        success: false,
        error: 'Seed Vault only available on Android'
      };
    }

    try {
      // Convert message to base64 for Android intent
      const messageBase64 = btoa(String.fromCharCode(...message));

      const result = await this.invokeAndroidIntent('com.solanamobile.seedvault.wallet.v1.ACTION_SIGN_TRANSACTION', {
        authToken,
        derivationPath,
        payload: messageBase64
      });

      if (result && result.signatures && result.signatures.length > 0) {
        return {
          success: true,
          signature: result.signatures[0]
        };
      }

      return {
        success: false,
        error: 'Failed to sign message'
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
    if (!this.isAndroid) {
      return {
        success: false,
        error: 'Seed Vault only available on Android'
      };
    }

    try {
      // Convert transaction to base64 for Android intent
      const transactionBase64 = btoa(String.fromCharCode(...transaction));

      const result = await this.invokeAndroidIntent('com.solanamobile.seedvault.wallet.v1.ACTION_SIGN_TRANSACTION', {
        authToken,
        derivationPath,
        payload: transactionBase64
      });

      if (result && result.signatures && result.signatures.length > 0) {
        return {
          success: true,
          signature: result.signatures[0]
        };
      }

      return {
        success: false,
        error: 'Failed to sign transaction'
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
    if (!this.isAndroid) {
      return false;
    }

    try {
      const hasNormal = await this.invokeAndroidMethod('hasPermission', ['com.solanamobile.seedvault.ACCESS_SEED_VAULT']);
      const hasPrivileged = await this.invokeAndroidMethod('hasPermission', ['com.solanamobile.seedvault.ACCESS_SEED_VAULT_PRIVILEGED']);
      return (hasNormal || hasPrivileged) || false;
    } catch (e) {
      console.error('Error checking permissions:', e);
      return false;
    }
  }

  /**
   * Request permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      // Try privileged permission first
      const privilegedResult = await this.invokeAndroidMethod('requestPermission', [
        'com.solanamobile.seedvault.ACCESS_SEED_VAULT_PRIVILEGED'
      ]);

      if (privilegedResult) {
        return true;
      }

      // Fall back to normal permission
      const normalResult = await this.invokeAndroidMethod('requestPermission', [
        'com.solanamobile.seedvault.ACCESS_SEED_VAULT'
      ]);

      return normalResult || false;
    } catch (e) {
      console.error('Error requesting permissions:', e);
      return false;
    }
  }

  // Helper methods for Android communication

  private async invokeAndroidIntent(action: string, extras?: any): Promise<any> {
    // This would be implemented through a Capacitor plugin
    // For now, return mock data
    console.log(`Would invoke Android intent: ${action}`, extras);
    return null;
  }

  private async queryContentProvider(table: string, selection?: any): Promise<any> {
    // This would be implemented through a Capacitor plugin
    // For now, return mock data
    console.log(`Would query content provider table: ${table}`, selection);
    return [];
  }

  private async invokeAndroidMethod(method: string, args: any[]): Promise<any> {
    // This would be implemented through a Capacitor plugin
    // For now, return mock data
    console.log(`Would invoke Android method: ${method}`, args);
    return null;
  }
}

// Export singleton instance
export const seedVault = new SeedVaultAPI();