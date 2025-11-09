/**
 * Unit tests for Seed Vault utility functions
 * Tests utility functions and helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidBase64,
  isValidSolanaAddress,
  isValidDerivationPath,
  getSolanaDerivationPath,
  formatDerivationPath,
  createSigningRequest,
  createBatchSigningRequest,
  parseSigningResult,
  publicKeyToAddress,
  getAccountDisplayName,
  getSeedDisplayName,
  filterAccountsByName,
  sortAccounts,
  formatBalance,
  generateAccountName,
  validateTransaction,
  estimateTransactionFee,
  createTimeoutPromise,
  retryOperation,
  debounce,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from '../utils';

describe('Seed Vault Utils', () => {
  describe('Base64 Validation', () => {
    it('should validate correct Base64 strings', () => {
      expect(isValidBase64('SGVsbG8gV29ybGQ=')).toBe(true);
      expect(isValidBase64('dGVzdA==')).toBe(true);
      expect(isValidBase64('')).toBe(true);
    });

    it('should reject invalid Base64 strings', () => {
      expect(isValidBase64('invalid!')).toBe(false);
      expect(isValidBase64('Hello World')).toBe(false);
      expect(isValidBase64('===')).toBe(false);
    });
  });

  describe('Solana Address Validation', () => {
    it('should validate correct Solana addresses', () => {
      expect(isValidSolanaAddress('11111111111111111111111111111112')).toBe(true);
      expect(isValidSolanaAddress('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidSolanaAddress('')).toBe(false);
      expect(isValidSolanaAddress('too-short')).toBe(false);
      expect(isValidSolanaAddress('invalid!@#$')).toBe(false);
      expect(isValidSolanaAddress('A'.repeat(100))).toBe(false);
    });
  });

  describe('Derivation Path Validation', () => {
    it('should validate correct derivation paths', () => {
      expect(isValidDerivationPath("m/44'/501'/0'/0'")).toBe(true);
      expect(isValidDerivationPath("m/44'/501'/0'/1'")).toBe(true);
      expect(isValidDerivationPath("m/44'/501'/1'/0'")).toBe(true);
    });

    it('should reject invalid derivation paths', () => {
      expect(isValidDerivationPath('')).toBe(false);
      expect(isValidDerivationPath('invalid/path')).toBe(false);
      expect(isValidDerivationPath('m/44')).toBe(false);
    });
  });

  describe('Derivation Path Generation', () => {
    it('should generate default Solana derivation path', () => {
      const path = getSolanaDerivationPath();
      expect(path).toBe("m/44'/501'/0'/0'");
    });

    it('should generate derivation path with custom indices', () => {
      const path = getSolanaDerivationPath(1, 2);
      expect(path).toBe("m/44'/501'/1'/2'");
    });
  });

  describe('Derivation Path Formatting', () => {
    it('should format derivation paths for display', () => {
      expect(formatDerivationPath("m/44'/501'/0'/0'")).toBe("m/44'/501'/0'/0'");
      expect(formatDerivationPath("m/44'/501'/1'/2'")).toBe("m/44'/501'/1'/2'");
    });
  });

  describe('Signing Request Creation', () => {
    it('should create signing request', () => {
      const request = createSigningRequest('base64payload', ["m/44'/501'/0'/0'"]);

      expect(request.payload).toBe('base64payload');
      expect(request.requestedSignatures).toEqual(["m/44'/501'/0'/0'"]);
    });

    it('should create batch signing requests', () => {
      const transactions = ['tx1', 'tx2'];
      const paths = ["m/44'/501'/0'/0'", "m/44'/501'/0'/1'"];

      const requests = createBatchSigningRequest(transactions, paths);

      expect(requests).toHaveLength(2);
      expect(requests[0].payload).toBe('tx1');
      expect(requests[0].requestedSignatures).toEqual(["m/44'/501'/0'/0'"]);
    });
  });

  describe('Signing Result Parsing', () => {
    it('should parse valid signing result', () => {
      const result = parseSigningResult({
        signatures: ['signature1', 'signature2'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'", "m/44'/501'/0'/1'"],
      });

      expect(result.isValid).toBe(true);
      expect(result.signatures).toHaveLength(2);
      expect(result.signatures[0]).toEqual(Uint8Array.from([115, 105, 103, 110, 97, 116, 117, 114, 101, 49]));
    });

    it('should handle invalid signature length', () => {
      const result = parseSigningResult({
        signatures: ['short'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid signature length detected');
    });

    it('should handle parsing errors', () => {
      const result = parseSigningResult({
        signatures: ['invalid-base64!'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
      });

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Failed to parse signatures');
    });
  });

  describe('Public Key to Address Conversion', () => {
    it('should convert public key to address', () => {
      const publicKey = new Uint8Array([1, 2, 3, 4, 5]);
      const address = publicKeyToAddress(publicKey);

      expect(typeof address).toBe('string');
      expect(address).toBe('AQIDBAU=');
    });
  });

  describe('Display Name Functions', () => {
    it('should get account display name', () => {
      const account = {
        id: 1,
        name: 'Main Account',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'base64key',
      };

      expect(getAccountDisplayName(account)).toBe('Main Account');
    });

    it('should use account number when no name', () => {
      const account = {
        id: 5,
        name: '',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'base64key',
      };

      expect(getAccountDisplayName(account)).toBe('Account 5');
    });

    it('should get seed display name', () => {
      const seed = {
        authToken: 12345,
        name: 'My Seed',
        purpose: 0,
      };

      expect(getSeedDisplayName(seed)).toBe('My Seed');
    });

    it('should use auth token when no seed name', () => {
      const seed = {
        authToken: 12345,
        name: '',
        purpose: 0,
      };

      expect(getSeedDisplayName(seed)).toBe('Seed 12345');
    });
  });

  describe('Account Filtering and Sorting', () => {
    const mockAccounts = [
      {
        id: 1,
        name: 'Main Account',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'key1',
      },
      {
        id: 2,
        name: 'Trading Account',
        derivationPath: "m/44'/501'/0'/1'",
        publicKeyEncoded: 'key2',
      },
      {
        id: 3,
        name: 'Savings',
        derivationPath: "m/44'/501'/1'/0'",
        publicKeyEncoded: 'key3',
      },
    ];

    it('should filter accounts by name', () => {
      const filtered = filterAccountsByName(mockAccounts, 'account');
      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('Main Account');
      expect(filtered[1].name).toBe('Trading Account');
    });

    it('should return all accounts for empty search', () => {
      const filtered = filterAccountsByName(mockAccounts, '');
      expect(filtered).toEqual(mockAccounts);
    });

    it('should sort accounts by name', () => {
      const sorted = sortAccounts(mockAccounts, 'name');
      expect(sorted[0].name).toBe('Main Account');
      expect(sorted[1].name).toBe('Savings');
      expect(sorted[2].name).toBe('Trading Account');
    });

    it('should sort accounts by ID', () => {
      const sorted = sortAccounts(mockAccounts, 'id');
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe('Balance Formatting', () => {
    it('should format balance with default decimals', () => {
      expect(formatBalance(1000000000)).toBe('1.000000000');
    });

    it('should format balance with custom decimals', () => {
      expect(formatBalance(500000000, 6)).toBe('0.500000');
    });

    it('should format very small numbers', () => {
      expect(formatBalance(1)).toBe('< 0.000001');
    });

    it('should format zero', () => {
      expect(formatBalance(0)).toBe('0');
    });
  });

  describe('Account Name Generation', () => {
    it('should generate unique account names', () => {
      const existingAccounts = [
        { id: 1, name: 'Account 1', derivationPath: '', publicKeyEncoded: '' },
        { id: 2, name: 'Account 3', derivationPath: '', publicKeyEncoded: '' },
      ];

      const name1 = generateAccountName(existingAccounts);
      const name2 = generateAccountName([...existingAccounts, { id: 3, name: name1, derivationPath: '', publicKeyEncoded: '' }]);

      expect(name1).toBe('Account 2');
      expect(name2).toBe('Account 4');
    });

    it('should start with Account 1 when no existing accounts', () => {
      const name = generateAccountName([]);
      expect(name).toBe('Account 1');
    });
  });

  describe('Transaction Validation', () => {
    it('should validate correct transaction', () => {
      const result = validateTransaction('dGVzdA==');
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject empty transaction', () => {
      const result = validateTransaction('');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Transaction cannot be empty');
    });

    it('should reject invalid Base64', () => {
      const result = validateTransaction('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Transaction must be valid Base64');
    });

    it('should reject oversize transaction', () => {
      const largeTx = 'A'.repeat(2001);
      const result = validateTransaction(largeTx);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Transaction is too large');
    });
  });

  describe('Transaction Fee Estimation', () => {
    it('should estimate transaction fee', () => {
      const fee = estimateTransactionFee(1);
      expect(fee).toBe(10000); // base fee + 1 signature
    });

    it('should estimate fee for multiple signatures', () => {
      const fee = estimateTransactionFee(3);
      expect(fee).toBe(20000); // base fee + 3 signatures
    });

    it('should use default signature count', () => {
      const fee = estimateTransactionFee();
      expect(fee).toBe(10000); // base fee + 1 signature
    });
  });

  describe('Promise Utilities', () => {
    it('should create timeout promise', async () => {
      const fastPromise = Promise.resolve('success');
      const result = await createTimeoutPromise(fastPromise, 1000);

      expect(result).toBe('success');
    });

    it('should timeout on slow promise', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 2000));

      await expect(
        createTimeoutPromise(slowPromise, 100)
      ).rejects.toThrow('Operation timed out');
    });

    it('should retry failed operation', async () => {
      let attempts = 0;
      const flakyOperation = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retryOperation(flakyOperation, 3);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should exhaust retries', async () => {
      const failingOperation = () => {
        throw new Error('Always fails');
      };

      await expect(
        retryOperation(failingOperation, 2)
      ).rejects.toThrow('Always fails');
    });
  });

  describe('Debounce Function', () => {
    it('should debounce function calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      // Call multiple times quickly
      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');
    });
  });

  describe('Base64 Conversion Utilities', () => {
    it('should convert Base64 to Uint8Array', () => {
      const result = base64ToUint8Array('SGVsbG8=');
      expect(result).toEqual(Uint8Array.from([72, 101, 108, 108, 111]));
    });

    it('should convert Uint8Array to Base64', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = uint8ArrayToBase64(bytes);
      expect(result).toBe('SGVsbG8=');
    });

    it('should handle empty conversions', () => {
      expect(base64ToUint8Array('')).toEqual(Uint8Array.from([]));
      expect(uint8ArrayToBase64(new Uint8Array())).toBe('');
    });

    it('should be reversible', () => {
      const original = 'Hello, World!';
      const bytes = base64ToUint8Array(btoa(original));
      const result = uint8ArrayToBase64(bytes);
      expect(result).toBe(btoa(original));
    });
  });
});