import { useState, useEffect, useCallback } from 'react';
import { seedVault, SeedVaultAPI, SeedVaultSeed, SeedVaultAccount, SeedVaultAuthResult } from '@/utils/seedVaultHelperNew';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * React hook for Seed Vault wallet functionality
 * Uses official @solana-mobile/seed-vault-lib for proper integration
 */
export function useSeedVaultNew() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasSeeds, setHasSeeds] = useState(false);
  const [seeds, setSeeds] = useState<SeedVaultSeed[]>([]);
  const [accounts, setAccounts] = useState<SeedVaultAccount[]>([]);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Check availability and permissions on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      // Check if Seed Vault is available
      const available = await seedVault.isAvailable();
      setIsAvailable(available);

      if (available) {
        // Check permissions
        const permissions = await seedVault.checkPermissions();
        setHasPermissions(permissions);

        if (permissions) {
          // Check for authorized seeds
          const hasAuthSeeds = await seedVault.hasAuthorizedSeeds();
          setHasSeeds(hasAuthSeeds);

          if (hasAuthSeeds) {
            const seedList = await seedVault.getAuthorizedSeeds();
            setSeeds(seedList);
          }
        }
      }
    } catch (e) {
      console.error('Error checking Seed Vault availability:', e);
      setError((e as Error).message);
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await seedVault.requestPermissions();
      setHasPermissions(granted);

      if (granted) {
        // Refresh seed availability after permissions granted
        await checkAvailability();
      }

      return granted;
    } catch (e) {
      const errorMsg = (e as Error).message || 'Failed to request permissions';
      setError(errorMsg);
      return false;
    }
  }, [checkAvailability]);

  const connect = useCallback(async (): Promise<string | null> => {
    if (!isAvailable) {
      setError('Seed Vault not available on this device');
      return null;
    }

    if (!hasPermissions) {
      setError('Seed Vault permissions not granted');
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

      const seedAccounts = await seedVault.getAccounts(firstSeed.authToken);
      setAccounts(seedAccounts);

      if (seedAccounts.length === 0) {
        setError('No accounts found for seed');
        setIsConnecting(false);
        return null;
      }

      // Use first account's public key
      const firstAccount = seedAccounts[0];
      if (!firstAccount.publicKeyEncoded) {
        setError('Account has no public key');
        setIsConnecting(false);
        return null;
      }

      // Convert base64 public key to Solana address
      try {
        const pubkeyBytes = Uint8Array.from(atob(firstAccount.publicKeyEncoded), c => c.charCodeAt(0));
        const solanaAddress = bs58.encode(pubkeyBytes);

        setConnectedAddress(solanaAddress);
        setIsConnecting(false);

        // Store in localStorage
        localStorage.setItem('wallet_address', solanaAddress);
        localStorage.setItem('wallet_type', 'seedvault');
        localStorage.setItem('seed_vault_auth_token', firstSeed.authToken.toString());

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
  }, [isAvailable, hasPermissions, hasSeeds, seeds]);

  const disconnect = useCallback(() => {
    setConnectedAddress(null);
    setAccounts([]);
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_type');
    localStorage.removeItem('seed_vault_auth_token');

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
    hasPermissions,
    hasSeeds,
    seeds,
    accounts,
    connectedAddress,
    isConnecting,
    error,
    connect,
    disconnect,
    refresh: checkAvailability,
    requestPermissions,
  };
}