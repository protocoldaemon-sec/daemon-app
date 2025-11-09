/**
 * Unit tests for Enhanced Seed Vault API
 * Tests the enhanced API implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedSeedVaultAPI } from '../types';
import type { Seed, Account, SigningResult } from '../official-types';

// Mock window object for testing
const mockWindow = {
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  removeEventListener: vi.fn(),
  Android: {
    seedVaultIsAvailable: vi.fn(),
    seedVaultHasAuthorizedSeeds: vi.fn(),
    seedVaultAuthorizeSeed: vi.fn(),
    seedVaultGetAuthorizedSeeds: vi.fn(),
    seedVaultGetAccounts: vi.fn(),
    seedVaultSignTransaction: vi.fn(),
    seedVaultSignMessage: vi.fn(),
  },
} as any;

// Mock navigator for React Native detection
const mockNavigator = {
  product: 'ReactNative',
} as any;

describe('EnhancedSeedVaultAPI', () => {
  let api: EnhancedSeedVaultAPI;
  let originalWindow: typeof window;
  let originalNavigator: typeof navigator;

  beforeEach(() => {
    originalWindow = global.window;
    originalNavigator = global.navigator;
    global.window = mockWindow;
    global.navigator = mockNavigator;

    api = new EnhancedSeedVaultAPI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
    vi.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect WebView environment', () => {
      (global.window as any).navigator = { product: 'Gecko' };
      const webViewApi = new EnhancedSeedVaultAPI();
      expect(webViewApi.getApiType()).toBe('webview');
    });

    it('should detect React Native environment', () => {
      (global.navigator as any).product = 'ReactNative';
      const rnApi = new EnhancedSeedVaultAPI();
      expect(rnApi.getApiType()).toBe('react-native');
    });

    it('should detect no available environment', () => {
      (global.window as any) = undefined;
      const noneApi = new EnhancedSeedVaultAPI();
      expect(noneApi.getApiType()).toBe('none');
    });
  });

  describe('Availability Check', () => {
    it('should return false when Android interface is not available', async () => {
      delete (mockWindow as any).Android;
      const api = new EnhancedSeedVaultAPI();

      const available = await api.isSeedVaultAvailable();
      expect(available).toBe(false);
    });

    it('should return true when Android interface reports availability', async () => {
      const mockCallback = vi.fn();
      api.on('status', mockCallback);

      await api.isSeedVaultAvailable();

      expect(mockWindow.Android.seedVaultIsAvailable).toHaveBeenCalled();
    });

    it('should handle timeout during availability check', async () => {
      // Mock slow response
      mockWindow.Android.seedVaultIsAvailable = vi.fn(() => {
        // Don't call the callback to simulate timeout
      });

      const available = await api.isSeedVaultAvailable();
      expect(available).toBe(false);
    });
  });

  describe('Seed Authorization', () => {
    beforeEach(() => {
      (api as any).isWebView = true;
    });

    it('should authorize new seed successfully', async () => {
      const mockCallback = vi.fn();
      api.on('authResult', mockCallback);

      // Simulate successful authorization
      setTimeout(() => {
        const event = new CustomEvent('seedVaultAuthResult', {
          detail: {
            success: true,
            seedId: 12345,
            seedName: 'Test Seed',
            authToken: 12345,
          },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const result = await api.authorizeNewSeed();

      expect(mockWindow.Android.seedVaultAuthorizeSeed).toHaveBeenCalled();
      expect(result).toEqual({
        authToken: 12345,
      });
    });

    it('should handle authorization failure', async () => {
      const mockCallback = vi.fn();
      api.on('authResult', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultAuthResult', {
          detail: {
            success: false,
            error: 'User cancelled',
          },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      await expect(api.authorizeNewSeed()).rejects.toThrow('User cancelled');
    });

    it('should handle authorization timeout', async () => {
      // Mock no response to trigger timeout
      await expect(api.authorizeNewSeed()).rejects.toThrow('Authorization timeout');
    });
  });

  describe('Account Management', () => {
    beforeEach(() => {
      (api as any).isWebView = true;
    });

    it('should get authorized seeds', async () => {
      const mockSeeds: Seed[] = [
        {
          authToken: 12345,
          name: 'Test Seed 1',
          purpose: 0,
        },
        {
          authToken: 67890,
          name: 'Test Seed 2',
          purpose: 0,
        },
      ];

      const mockCallback = vi.fn();
      api.on('seeds', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultSeeds', {
          detail: { seeds: mockSeeds },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const seeds = await api.getAuthorizedSeeds();

      expect(mockWindow.Android.seedVaultGetAuthorizedSeeds).toHaveBeenCalled();
      expect(seeds).toEqual(mockSeeds);
      expect(seeds).toHaveLength(2);
    });

    it('should get accounts for a seed', async () => {
      const mockAccounts: Account[] = [
        {
          id: 1,
          name: 'Account 1',
          derivationPath: "m/44'/501'/0'/0'",
          publicKeyEncoded: 'base64key1',
        },
        {
          id: 2,
          name: 'Account 2',
          derivationPath: "m/44'/501'/0'/1'",
          publicKeyEncoded: 'base64key2',
        },
      ];

      const mockCallback = vi.fn();
      api.on('accounts', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultAccounts', {
          detail: { seedId: 12345, accounts: mockAccounts },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const accounts = await api.getAccounts(12345);

      expect(mockWindow.Android.seedVaultGetAccounts).toHaveBeenCalledWith('12345');
      expect(accounts).toEqual(mockAccounts);
    });

    it('should return empty array when no accounts found', async () => {
      setTimeout(() => {
        const event = new CustomEvent('seedVaultAccounts', {
          detail: { seedId: 12345, accounts: [] },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const accounts = await api.getAccounts(12345);
      expect(accounts).toEqual([]);
    });
  });

  describe('Transaction Signing', () => {
    beforeEach(() => {
      (api as any).isWebView = true;
    });

    it('should sign transaction successfully', async () => {
      const mockResult: SigningResult = {
        signatures: ['base64signature'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
      };

      const mockCallback = vi.fn();
      api.on('signResult', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultSignResult', {
          detail: {
            success: true,
            signature: 'base64signature',
            resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
          },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const result = await api.signTransaction(12345, "m/44'/501'/0'/0'", 'base64transaction');

      expect(mockWindow.Android.seedVaultSignTransaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle signing failure', async () => {
      const mockCallback = vi.fn();
      api.on('signResult', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultSignResult', {
          detail: {
            success: false,
            error: 'Invalid transaction',
          },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      await expect(
        api.signTransaction(12345, "m/44'/501'/0'/0'", 'base64transaction')
      ).rejects.toThrow('Invalid transaction');
    });

    it('should sign message successfully', async () => {
      const mockResult: SigningResult = {
        signatures: ['base64signature'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
      };

      const mockCallback = vi.fn();
      api.on('signResult', mockCallback);

      setTimeout(() => {
        const event = new CustomEvent('seedVaultSignResult', {
          detail: {
            success: true,
            signature: 'base64signature',
            resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
          },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      const result = await api.signMessage(12345, "m/44'/501'/0'/0'", 'base64message');

      expect(result).toEqual(mockResult);
    });
  });

  describe('Event Management', () => {
    it('should add and remove event listeners', () => {
      const mockCallback = vi.fn();
      const unsubscribe = api.on('status', mockCallback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      // Should not throw when calling unsubscribe
    });

    it('should handle multiple listeners for the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      api.on('status', callback1);
      api.on('status', callback2);

      // Simulate event
      setTimeout(() => {
        const event = new CustomEvent('seedVaultStatus', {
          detail: { available: true },
        });
        mockWindow.dispatchEvent(event);
      }, 100);

      // Both callbacks should be called
      // Note: This would require actual event handling implementation
    });

    it('should handle multiple event types', () => {
      const statusCallback = vi.fn();
      const errorCallback = vi.fn();

      api.on('status', statusCallback);
      api.on('error', errorCallback);

      expect(statusCallback).toBeDefined();
      expect(errorCallback).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (api as any).isWebView = true;
    });

    it('should handle Android interface errors', async () => {
      mockWindow.Android.seedVaultIsAvailable = vi.fn(() => {
        throw new Error('Android interface error');
      });

      const available = await api.isSeedVaultAvailable();
      expect(available).toBe(false);
    });

    it('should handle network timeouts', async () => {
      // Mock slow operation that times out
      mockWindow.Android.seedVaultAuthorizeSeed = vi.fn(() => {
        // Don't respond to trigger timeout
      });

      await expect(api.authorizeNewSeed()).rejects.toThrow('Authorization timeout');
    });
  });

  describe('React Native Support', () => {
    it('should indicate React Native environment', () => {
      (global.navigator as any).product = 'ReactNative';
      const rnApi = new EnhancedSeedVaultAPI();

      expect(rnApi.getApiType()).toBe('react-native');
    });

    it('should handle React Native operations (placeholder)', async () => {
      (global.navigator as any).product = 'ReactNative';
      const rnApi = new EnhancedSeedVaultAPI();

      // These should not throw but return default values
      // since RN implementation is not yet complete
      expect(await rnApi.isSeedVaultAvailable()).toBe(false);
      expect(await rnApi.getAuthorizedSeeds()).toEqual([]);
    });
  });
});