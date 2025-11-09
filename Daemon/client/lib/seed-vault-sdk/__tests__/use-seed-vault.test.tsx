/**
 * Unit tests for useSeedVault hook
 * Tests React hook functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSeedVault, useSeedVaultSigning } from '../useSeedVault';
import type { Seed, Account, SigningResult } from '../official-types';

// Mock the enhancedSeedVault module
vi.mock('../types', () => ({
  EnhancedSeedVaultAPI: vi.fn().mockImplementation(() => ({
    isSeedVaultAvailable: vi.fn(),
    authorizeNewSeed: vi.fn(),
    getAuthorizedSeeds: vi.fn(),
    getAccounts: vi.fn(),
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    getApiType: vi.fn().mockReturnValue('webview'),
    on: vi.fn(),
  })),
  enhancedSeedVault: {
    isSeedVaultAvailable: vi.fn(),
    authorizeNewSeed: vi.fn(),
    getAuthorizedSeeds: vi.fn(),
    getAccounts: vi.fn(),
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    getApiType: vi.fn().mockReturnValue('webview'),
    on: vi.fn(),
  },
}));

// Mock the constants
vi.mock('../index', () => ({
  SOLANA_DERIVATION_PATHS: {
    BIP44: "m/44'/501'/0'/0'",
  },
}));

import { enhancedSeedVault } from '../types';

describe('useSeedVault Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSeedVault());

      expect(result.current.isAvailable).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.authorizedSeeds).toEqual([]);
      expect(result.current.accounts).toEqual([]);
      expect(result.current.currentSeed).toBe(null);
      expect(result.current.apiType).toBe('webview');
    });
  });

  describe('Availability Check', () => {
    it('should check availability on mount', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(true);

      const { result } = renderHook(() => useSeedVault());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });

      expect(enhancedSeedVault.isSeedVaultAvailable).toHaveBeenCalledWith(true);
    });

    it('should handle availability check failure', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(false);

      const { result } = renderHook(() => useSeedVault());

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should manually check availability', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(true);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const available = await result.current.checkAvailability();
        expect(available).toBe(true);
      });
    });
  });

  describe('Seed Authorization', () => {
    const mockSeed: Seed = {
      authToken: 12345,
      name: 'Test Seed',
      purpose: 0,
    };

    it('should authorize new seed successfully', async () => {
      vi.mocked(enhancedSeedVault.authorizeNewSeed).mockResolvedValue({ authToken: 12345 });
      vi.mocked(enhancedSeedVault.getAuthorizedSeeds).mockResolvedValue([mockSeed]);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const seed = await result.current.authorizeNewSeed();
        expect(seed).toEqual(mockSeed);
      });

      expect(result.current.authorizedSeeds).toEqual([mockSeed]);
      expect(result.current.currentSeed).toEqual(mockSeed);
    });

    it('should handle authorization failure', async () => {
      vi.mocked(enhancedSeedVault.authorizeNewSeed).mockRejectedValue(new Error('Authorization failed'));

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const seed = await result.current.authorizeNewSeed();
        expect(seed).toBe(null);
      });

      expect(result.current.error).toBe('Authorization failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error on successful authorization', async () => {
      // First call fails
      vi.mocked(enhancedSeedVault.authorizeNewSeed)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({ authToken: 12345 });
      vi.mocked(enhancedSeedVault.getAuthorizedSeeds).mockResolvedValue([mockSeed]);

      const { result } = renderHook(() => useSeedVault());

      // First attempt fails
      await act(async () => {
        await result.current.authorizeNewSeed();
      });
      expect(result.current.error).toBe('First failure');

      // Second attempt succeeds
      await act(async () => {
        await result.current.authorizeNewSeed();
      });
      expect(result.current.error).toBe(null);
    });
  });

  describe('Account Management', () => {
    const mockAccounts: Account[] = [
      {
        id: 1,
        name: 'Account 1',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'key1',
      },
      {
        id: 2,
        name: 'Account 2',
        derivationPath: "m/44'/501'/0'/1'",
        publicKeyEncoded: 'key2',
      },
    ];

    it('should get accounts for selected seed', async () => {
      vi.mocked(enhancedSeedVault.getAccounts).mockResolvedValue(mockAccounts);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const accounts = await result.current.getAccounts(12345);
        expect(accounts).toEqual(mockAccounts);
      });

      expect(result.current.accounts).toEqual(mockAccounts);
      expect(enhancedSeedVault.getAccounts).toHaveBeenCalledWith(12345);
    });

    it('should handle empty account list', async () => {
      vi.mocked(enhancedSeedVault.getAccounts).mockResolvedValue([]);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const accounts = await result.current.getAccounts(12345);
        expect(accounts).toEqual([]);
      });

      expect(result.current.accounts).toEqual([]);
    });

    it('should handle account fetch failure', async () => {
      vi.mocked(enhancedSeedVault.getAccounts).mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const accounts = await result.current.getAccounts(12345);
        expect(accounts).toEqual([]);
      });

      expect(result.current.error).toBe('Fetch failed');
    });
  });

  describe('Transaction Signing', () => {
    const mockResult: SigningResult = {
      signatures: ['signature1'],
      resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
    };

    it('should sign transaction successfully', async () => {
      vi.mocked(enhancedSeedVault.signTransaction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const result = await result.current.signTransaction(12345, 'base64tx', "m/44'/501'/0'/0'");
        expect(result).toEqual(mockResult);
      });

      expect(enhancedSeedVault.signTransaction).toHaveBeenCalledWith(
        12345,
        'base64tx',
        "m/44'/501'/0'/0'"
      );
    });

    it('should use default derivation path', async () => {
      vi.mocked(enhancedSeedVault.signTransaction).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        await result.current.signTransaction(12345, 'base64tx');
      });

      expect(enhancedSeedVault.signTransaction).toHaveBeenCalledWith(
        12345,
        'base64tx',
        "m/44'/501'/0'/0'"
      );
    });

    it('should handle signing failure', async () => {
      vi.mocked(enhancedSeedVault.signTransaction).mockRejectedValue(new Error('Signing failed'));

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const result = await result.current.signTransaction(12345, 'base64tx');
        expect(result).toBe(null);
      });

      expect(result.current.error).toBe('Signing failed');
    });

    it('should set loading state during signing', async () => {
      let resolvePromise: (value: SigningResult) => void;
      const signingPromise = new Promise<SigningResult>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(enhancedSeedVault.signTransaction).mockReturnValue(signingPromise);

      const { result } = renderHook(() => useSeedVault());

      act(() => {
        result.current.signTransaction(12345, 'base64tx');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!(mockResult);
        await signingPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Message Signing', () => {
    const mockResult: SigningResult = {
      signatures: ['msgSignature'],
      resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
    };

    it('should sign message successfully', async () => {
      vi.mocked(enhancedSeedVault.signMessage).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const result = await result.current.signMessage(12345, 'Hello', "m/44'/501'/0'/0'");
        expect(result).toEqual(mockResult);
      });

      expect(enhancedSeedVault.signMessage).toHaveBeenCalledWith(
        12345,
        'SGVsbG8=', // Base64 encoded 'Hello'
        "m/44'/501'/0'/0'"
      );
    });

    it('should handle message signing failure', async () => {
      vi.mocked(enhancedSeedVault.signMessage).mockRejectedValue(new Error('Message signing failed'));

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        const result = await result.current.signMessage(12345, 'Hello');
        expect(result).toBe(null);
      });

      expect(result.current.error).toBe('Message signing failed');
    });
  });

  describe('Error Handling', () => {
    it('should clear error manually', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useSeedVault());

      // Trigger an error
      await act(async () => {
        await result.current.checkAvailability();
      });
      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBe(null);
    });

    it('should handle API type detection', () => {
      vi.mocked(enhancedSeedVault.getApiType).mockReturnValue('react-native');

      const { result } = renderHook(() => useSeedVault());
      expect(result.current.apiType).toBe('react-native');
    });
  });

  describe('Data Refresh', () => {
    it('should refresh all data', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(true);
      vi.mocked(enhancedSeedVault.getAuthorizedSeeds).mockResolvedValue([]);

      const { result } = renderHook(() => useSeedVault());

      await act(async () => {
        await result.current.refreshData();
      });

      expect(enhancedSeedVault.isSeedVaultAvailable).toHaveBeenCalled();
      expect(enhancedSeedVault.getAuthorizedSeeds).toHaveBeenCalled();
    });
  });

  describe('Auto-selection Logic', () => {
    const mockSeeds: Seed[] = [
      {
        authToken: 12345,
        name: 'First Seed',
        purpose: 0,
      },
      {
        authToken: 67890,
        name: 'Second Seed',
        purpose: 0,
      },
    ];

    it('should auto-select first seed when seeds become available', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(true);
      vi.mocked(enhancedSeedVault.getAuthorizedSeeds).mockResolvedValue(mockSeeds);

      const { result } = renderHook(() => useSeedVault());

      await waitFor(() => {
        expect(result.current.currentSeed).toEqual(mockSeeds[0]);
      });
    });

    it('should not auto-select when no seeds available', async () => {
      vi.mocked(enhancedSeedVault.isSeedVaultAvailable).mockResolvedValue(true);
      vi.mocked(enhancedSeedVault.getAuthorizedSeeds).mockResolvedValue([]);

      const { result } = renderHook(() => useSeedVault());

      await waitFor(() => {
        expect(result.current.currentSeed).toBe(null);
      });
    });
  });
});

describe('useSeedVaultSigning Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null functions when no auth token provided', () => {
    const { result } = renderHook(() => useSeedVaultSigning(null));

    expect(result.current.signTransaction).toBe(null);
    expect(result.current.signMessage).toBe(null);
    expect(result.current.getPublicKey).toBe(null);
  });

  it('should provide functions when auth token is provided', () => {
    const { result } = renderHook(() => useSeedVaultSigning(12345));

    expect(typeof result.current.signTransaction).toBe('function');
    expect(typeof result.current.signMessage).toBe('function');
    expect(typeof result.current.getPublicKey).toBe('function');
  });

  it('should pass through auth token to underlying functions', async () => {
    const mockResult: SigningResult = {
      signatures: ['signature'],
      resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
    };
    vi.mocked(enhancedSeedVault.signTransaction).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSeedVaultSigning(12345));

    await act(async () => {
      const signFn = result.current.signTransaction;
      if (signFn) {
        await signFn('base64tx');
      }
    });

    expect(enhancedSeedVault.signTransaction).toHaveBeenCalledWith(
      12345,
      'base64tx',
      "m/44'/501'/0'/0'"
    );
  });
});