/**
 * Seed Vault Utility Functions
 * Helper functions for working with Seed Vault SDK
 */

import {
  Seed,
  Account,
  SeedPublicKey,
  SigningRequest,
  SigningResult,
  base64ToUint8Array,
  uint8ArrayToBase64
} from './index';

// BIP-39 word list for mnemonic validation (first 4 words for demonstration)
export const BIP39_WORDLIST = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
  'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
  'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  // ... (full word list would be included in production)
];

/**
 * Validate if a string is a valid Base64 encoded string
 */
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

/**
 * Validate Solana address (base58 encoded)
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    // Basic validation for base58 encoding
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(address)) return false;

    // Check length (Solana addresses are typically 44 characters)
    if (address.length < 32 || address.length > 44) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate derivation path format
 */
export function isValidDerivationPath(path: string): boolean {
  const derivationPathRegex = /^m(\/\d+'?)*$/;
  return derivationPathRegex.test(path);
}

/**
 * Get the default derivation path for Solana
 */
export function getSolanaDerivationPath(accountIndex: number = 0, changeIndex: number = 0): string {
  return `m/44'/501'/${accountIndex}'/0'/${changeIndex}`;
}

/**
 * Format derivation path for display
 */
export function formatDerivationPath(path: string): string {
  return path.replace(/'/g, "'");
}

/**
 * Create a signing request for multiple transactions
 */
export function createBatchSigningRequest(transactions: string[], derivationPaths: string[]): SigningRequest[] {
  return transactions.map((tx, index) => ({
    payload: tx,
    requestedSignatures: [derivationPaths[index] || derivationPaths[0]],
  }));
}

/**
 * Parse and validate signing results
 */
export function parseSigningResult(result: SigningResult): {
  signatures: Uint8Array[];
  isValid: boolean;
  errorMessage?: string;
} {
  try {
    const signatures = result.signatures.map(sig => base64ToUint8Array(sig));

    // Validate each signature length (Ed25519 signatures are 64 bytes)
    const isValidSignatures = signatures.every(sig => sig.length === 64);

    if (!isValidSignatures) {
      return {
        signatures,
        isValid: false,
        errorMessage: 'Invalid signature length detected',
      };
    }

    return {
      signatures,
      isValid: true,
    };
  } catch (error) {
    return {
      signatures: [],
      isValid: false,
      errorMessage: `Failed to parse signatures: ${(error as Error).message}`,
    };
  }
}

/**
 * Convert public key to Solana address format
 */
export function publicKeyToAddress(publicKeyBytes: Uint8Array): string {
  // This would use bs58 encoding in a real implementation
  // For now, return base64 as placeholder
  return uint8ArrayToBase64(publicKeyBytes);
}

/**
 * Get account display name
 */
export function getAccountDisplayName(account: Account): string {
  return account.name || `Account ${account.id}`;
}

/**
 * Get seed display name
 */
export function getSeedDisplayName(seed: Seed): string {
  return seed.name || `Seed ${seed.authToken}`;
}

/**
 * Filter accounts by name
 */
export function filterAccountsByName(accounts: Account[], searchTerm: string): Account[] {
  if (!searchTerm.trim()) return accounts;

  const lowerSearchTerm = searchTerm.toLowerCase();
  return accounts.filter(account =>
    account.name.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Sort accounts by name or ID
 */
export function sortAccounts(accounts: Account[], sortBy: 'name' | 'id' = 'name'): Account[] {
  return [...accounts].sort((a, b) => {
    if (sortBy === 'name') {
      return getAccountDisplayName(a).localeCompare(getAccountDisplayName(b));
    } else {
      return a.id - b.id;
    }
  });
}

/**
 * Format account balance for display
 */
export function formatBalance(balance: number, decimals: number = 9): string {
  const divisor = Math.pow(10, decimals);
  const formattedBalance = balance / divisor;

  if (formattedBalance === 0) return '0';
  if (formattedBalance < 0.000001) return '< 0.000001';
  if (formattedBalance < 1) return formattedBalance.toFixed(6);
  if (formattedBalance < 1000) return formattedBalance.toFixed(3);

  return formattedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Generate a unique account name
 */
export function generateAccountName(existingAccounts: Account[]): string {
  const usedNames = new Set(existingAccounts.map(acc => acc.name.toLowerCase()));

  let counter = 1;
  let name = `Account ${counter}`;

  while (usedNames.has(name.toLowerCase())) {
    counter++;
    name = `Account ${counter}`;
  }

  return name;
}

/**
 * Validate transaction before signing
 */
export function validateTransaction(transaction: string): {
  isValid: boolean;
  errorMessage?: string;
} {
  try {
    if (!transaction) {
      return { isValid: false, errorMessage: 'Transaction cannot be empty' };
    }

    if (!isValidBase64(transaction)) {
      return { isValid: false, errorMessage: 'Transaction must be valid Base64' };
    }

    const transactionBytes = base64ToUint8Array(transaction);

    // Basic size check (Solana transactions are typically < 1232 bytes)
    if (transactionBytes.length === 0) {
      return { isValid: false, errorMessage: 'Transaction cannot be empty' };
    }

    if (transactionBytes.length > 2000) {
      return { isValid: false, errorMessage: 'Transaction is too large' };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: `Invalid transaction format: ${(error as Error).message}`
    };
  }
}

/**
 * Estimate transaction fee
 */
export function estimateTransactionFee(signatureCount: number = 1): number {
  // Base fee is 5000 lamports
  // Each signature costs 5000 lamports
  const baseFee = 5000;
  const signatureFee = 5000 * signatureCount;

  return baseFee + signatureFee;
}

/**
 * Create a timeout promise for operations
 */
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry a failed operation
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

/**
 * Debounce function for search operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitMs);
  };
}