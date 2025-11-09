/**
 * Enhanced Seed Vault SDK
 * Main export file for the Seed Vault integration
 */

// Export official types
export * from './official-types';

// Export enhanced API implementation
export { EnhancedSeedVaultAPI, enhancedSeedVault, seedVault } from './types';

// Export React hooks
export { useSeedVault, useSeedVaultSigning } from './useSeedVault';

// Export hook types
export type { UseSeedVaultState, UseSeedVaultActions } from './useSeedVault';

// Export legacy types for backward compatibility
export type {
  SeedVaultStatus,
  SeedVaultAuthResult,
  SeedVaultSignResult
} from './types';

// Export constants
export const SEED_PURPOSE = {
  SIGN_SOLANA_TRANSACTION: 0,
} as const;

// BIP-44 derivation paths for Solana
export const SOLANA_DERIVATION_PATHS = {
  // Standard BIP-44 path for Solana
  BIP44: "m/44'/501'/0'/0'",
  // Alternative paths
  WALLET: "m/44'/501'/0'/0'",
  ACCOUNT: "m/44'/501'/0'/0'",
  CHANGE: "m/44'/501'/0'/0/0",
} as const;

// Helper functions
export const createSigningRequest = (payload: string, derivationPaths: string[]) => ({
  payload,
  requestedSignatures: derivationPaths,
});

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binaryString = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
};

// Export utilities
export * from './utils';

// Export configuration
export * from './config';