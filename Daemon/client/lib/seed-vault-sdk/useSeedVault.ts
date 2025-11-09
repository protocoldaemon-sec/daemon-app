/**
 * Enhanced Seed Vault React Hook
 * Provides a convenient interface for using Seed Vault in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedSeedVault } from './types';
import {
  Seed,
  Account,
  SeedPublicKey,
  SigningResult,
  SeedPurpose,
  SOLANA_DERIVATION_PATHS
} from './index';

export interface UseSeedVaultState {
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  authorizedSeeds: Seed[];
  accounts: Account[];
  currentSeed: Seed | null;
  apiType: 'react-native' | 'webview' | 'none';
}

export interface UseSeedVaultActions {
  checkAvailability: () => Promise<boolean>;
  authorizeNewSeed: () => Promise<Seed | null>;
  getAuthorizedSeeds: () => Promise<Seed[]>;
  getAccounts: (authToken: number) => Promise<Account[]>;
  getPublicKey: (authToken: number, derivationPath?: string) => Promise<SeedPublicKey | null>;
  signTransaction: (authToken: number, transaction: string, derivationPath?: string) => Promise<SigningResult | null>;
  signMessage: (authToken: number, message: string, derivationPath?: string) => Promise<SigningResult | null>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export function useSeedVault(): UseSeedVaultState & UseSeedVaultActions {
  const [state, setState] = useState<UseSeedVaultState>({
    isAvailable: false,
    isLoading: true,
    error: null,
    authorizedSeeds: [],
    accounts: [],
    currentSeed: null,
    apiType: 'none',
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check Seed Vault availability
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const available = await enhancedSeedVault.isSeedVaultAvailable(true);
      const apiType = enhancedSeedVault.getApiType();

      setState(prev => ({
        ...prev,
        isAvailable: available,
        apiType,
        isLoading: false,
      }));

      return available;
    } catch (error) {
      setError((error as Error).message);
      return false;
    }
  }, [setLoading, setError]);

  // Authorize a new seed
  const authorizeNewSeed = useCallback(async (): Promise<Seed | null> => {
    try {
      setLoading(true);
      clearError();

      const result = await enhancedSeedVault.authorizeNewSeed();

      // Refresh seeds list after authorization
      const seeds = await enhancedSeedVault.getAuthorizedSeeds();

      setState(prev => ({
        ...prev,
        authorizedSeeds: seeds,
        currentSeed: seeds[0] || null,
        isLoading: false,
      }));

      return seeds[0] || null;
    } catch (error) {
      setError((error as Error).message);
      return null;
    }
  }, [setLoading, clearError, setError]);

  // Get authorized seeds
  const getAuthorizedSeeds = useCallback(async (): Promise<Seed[]> => {
    try {
      clearError();
      const seeds = await enhancedSeedVault.getAuthorizedSeeds();

      setState(prev => ({
        ...prev,
        authorizedSeeds: seeds,
        currentSeed: prev.currentSeed || seeds[0] || null,
      }));

      return seeds;
    } catch (error) {
      setError((error as Error).message);
      return [];
    }
  }, [clearError, setError]);

  // Get accounts for a seed
  const getAccounts = useCallback(async (authToken: number): Promise<Account[]> => {
    try {
      clearError();
      const accounts = await enhancedSeedVault.getAccounts(authToken);

      setState(prev => ({ ...prev, accounts }));
      return accounts;
    } catch (error) {
      setError((error as Error).message);
      return [];
    }
  }, [clearError, setError]);

  // Get public key for a derivation path
  const getPublicKey = useCallback(
    async (authToken: number, derivationPath: string = SOLANA_DERIVATION_PATHS.BIP44): Promise<SeedPublicKey | null> => {
      try {
        clearError();
        const publicKey = await enhancedSeedVault.getPublicKey(authToken, derivationPath);
        return publicKey;
      } catch (error) {
        setError((error as Error).message);
        return null;
      }
    },
    [clearError, setError]
  );

  // Sign a transaction
  const signTransaction = useCallback(
    async (
      authToken: number,
      transaction: string,
      derivationPath: string = SOLANA_DERIVATION_PATHS.BIP44
    ): Promise<SigningResult | null> => {
      try {
        setLoading(true);
        clearError();

        const result = await enhancedSeedVault.signTransaction(authToken, derivationPath, transaction);
        return result;
      } catch (error) {
        setError((error as Error).message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError]
  );

  // Sign a message
  const signMessage = useCallback(
    async (
      authToken: number,
      message: string,
      derivationPath: string = SOLANA_DERIVATION_PATHS.BIP44
    ): Promise<SigningResult | null> => {
      try {
        setLoading(true);
        clearError();

        const result = await enhancedSeedVault.signMessage(authToken, derivationPath, message);
        return result;
      } catch (error) {
        setError((error as Error).message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError]
  );

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await Promise.all([
      checkAvailability(),
      getAuthorizedSeeds(),
    ]);
  }, [checkAvailability, getAuthorizedSeeds]);

  // Initialize on mount
  useEffect(() => {
    checkAvailability();
    getAuthorizedSeeds();
  }, [checkAvailability, getAuthorizedSeeds]);

  return {
    ...state,
    checkAvailability,
    authorizeNewSeed,
    getAuthorizedSeeds,
    getAccounts,
    getPublicKey,
    signTransaction,
    signMessage,
    refreshData,
    clearError,
  };
}

// Convenience hook for specific operations
export function useSeedVaultSigning(authToken: number | null) {
  const { signTransaction, signMessage, getPublicKey, isLoading, error } = useSeedVault();

  return {
    signTransaction: authToken ? (tx: string, path?: string) => signTransaction(authToken, tx, path) : null,
    signMessage: authToken ? (msg: string, path?: string) => signMessage(authToken, msg, path) : null,
    getPublicKey: authToken ? (path?: string) => getPublicKey(authToken, path) : null,
    isLoading,
    error,
  };
}