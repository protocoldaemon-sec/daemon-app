import { useState, useEffect, useCallback } from 'react';
import { seedVault, SeedVaultAPI, SeedVaultSeed, SeedVaultAccount, SeedVaultAuthResult } from '@/utils/seedVaultHelper';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * React hook for Seed Vault wallet functionality
 * Provides a native wallet option using Seed Vault key custody (Saga phones)
 */
export function useSeedVault() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasSeeds, setHasSeeds] = useState(false);
  const [seeds, setSeeds] = useState<SeedVaultSeed[]>([]);
  const [accounts, setAccounts] = useState<SeedVaultAccount[]>([]);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    try {
      const available = await seedVault.isAvailable();
      setIsAvailable(available);

      if (available) {
        const hasAuthSeeds = await seedVault.hasAuthorizedSeeds();
        setHasSeeds(hasAuthSeeds);

        if (hasAuthSeeds) {
          const seedList = await seedVault.getAuthorizedSeeds();
          setSeeds(seedList);
        }
      }
    } catch (e) {
      console.error('Error checking Seed Vault availability:', e);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!isAvailable) {
      setError('Seed Vault not available on this device');
      return null;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // If no seeds authorized, request authorization
      if (!hasSeeds || seeds.length === 0) {
        const authResult = await seedVault.authorizeSeed();
        if (!authResult.success) {
          setError(authResult.error || 'Failed to authorize seed');
          setIsConnecting(false);
          return null;
        }

        // Refresh seeds list
        const updatedSeeds = await seedVault.getAuthorizedSeeds();
        setSeeds(updatedSeeds);
        setHasSeeds(updatedSeeds.length > 0);

        if (updatedSeeds.length === 0) {
          setError('No seeds authorized');
          setIsConnecting(false);
          return null;
        }
      }

      // Get first seed's accounts
      const firstSeed = seeds[0] || (await seedVault.getAuthorizedSeeds())[0];
      if (!firstSeed) {
        setError('No seeds available');
        setIsConnecting(false);
        return null;
      }

      const seedAccounts = await seedVault.getAccounts(firstSeed.seedId);
      setAccounts(seedAccounts);

      if (seedAccounts.length === 0) {
        setError('No accounts found for seed');
        setIsConnecting(false);
        return null;
      }

      // Use first account's public key
      const firstAccount = seedAccounts[0];
      if (!firstAccount.publicKey) {
        setError('Account has no public key');
        setIsConnecting(false);
        return null;
      }

      // Convert base64 public key to Solana address
      try {
        const pubkeyBytes = Uint8Array.from(atob(firstAccount.publicKey), c => c.charCodeAt(0));
        const solanaAddress = bs58.encode(pubkeyBytes);
        
        setConnectedAddress(solanaAddress);
        setIsConnecting(false);

        // Store in localStorage
        localStorage.setItem('wallet_address', solanaAddress);
        localStorage.setItem('wallet_type', 'seedvault');
        localStorage.setItem('seed_vault_seed_id', firstSeed.seedId.toString());

        // Dispatch event
        window.dispatchEvent(new CustomEvent('walletConnected', {
          detail: { type: 'seedvault', address: solanaAddress }
        }));

        return solanaAddress;
      } catch (e) {
        setError('Failed to convert public key to address');
        setIsConnecting(false);
        return null;
      }
    } catch (e) {
      const errorMsg = (e as Error).message || 'Unknown error';
      setError(errorMsg);
      setIsConnecting(false);
      return null;
    }
  }, [isAvailable, hasSeeds, seeds]);

  const disconnect = useCallback(() => {
    setConnectedAddress(null);
    setAccounts([]);
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_type');
    localStorage.removeItem('seed_vault_seed_id');
    
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem('wallet_address');
    const storedType = localStorage.getItem('wallet_type');
    
    if (storedAddress && storedType === 'seedvault') {
      setConnectedAddress(storedAddress);
    }
  }, []);

  return {
    isAvailable,
    isChecking,
    hasSeeds,
    seeds,
    accounts,
    connectedAddress,
    isConnecting,
    error,
    connect,
    disconnect,
    refresh: checkAvailability,
  };
}

