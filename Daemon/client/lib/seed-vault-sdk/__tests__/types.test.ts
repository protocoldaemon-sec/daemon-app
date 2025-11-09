/**
 * Unit tests for Seed Vault SDK types
 * Tests type definitions and interfaces
 */

import type {
  Seed,
  Account,
  SeedPublicKey,
  SigningRequest,
  SigningResult,
  SeedPurpose,
  DerivationPath,
  SeedVaultAPI,
} from '../official-types';

describe('Seed Vault SDK Types', () => {
  describe('Seed', () => {
    it('should create a valid Seed object', () => {
      const seed: Seed = {
        authToken: 12345,
        name: 'Test Seed',
        purpose: 0,
      };

      expect(seed.authToken).toBe(12345);
      expect(seed.name).toBe('Test Seed');
      expect(seed.purpose).toBe(0);
    });

    it('should accept SeedPurpose values', () => {
      const seed: Seed = {
        authToken: 123,
        name: 'Solana Seed',
        purpose: SeedPurpose.SignSolanaTransaction,
      };

      expect(seed.purpose).toBe(SeedPurpose.SignSolanaTransaction);
    });
  });

  describe('Account', () => {
    it('should create a valid Account object', () => {
      const account: Account = {
        id: 1,
        name: 'Test Account',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'base64encodedkey123',
      };

      expect(account.id).toBe(1);
      expect(account.name).toBe('Test Account');
      expect(account.derivationPath).toBe("m/44'/501'/0'/0'");
      expect(account.publicKeyEncoded).toBe('base64encodedkey123');
    });

    it('should handle empty name', () => {
      const account: Account = {
        id: 1,
        name: '',
        derivationPath: "m/44'/501'/0'/0'",
        publicKeyEncoded: 'base64encodedkey123',
      };

      expect(account.name).toBe('');
    });
  });

  describe('SeedPublicKey', () => {
    it('should create a valid SeedPublicKey object', () => {
      const publicKey = new Uint8Array([1, 2, 3, 4, 5]);
      const seedPublicKey: SeedPublicKey = {
        publicKey,
        publicKeyEncoded: 'base64encoded',
        resolvedDerivationPath: "m/44'/501'/0'/0'",
      };

      expect(seedPublicKey.publicKey).toEqual(publicKey);
      expect(seedPublicKey.publicKeyEncoded).toBe('base64encoded');
      expect(seedPublicKey.resolvedDerivationPath).toBe("m/44'/501'/0'/0'");
    });
  });

  describe('SigningRequest', () => {
    it('should create a valid SigningRequest object', () => {
      const request: SigningRequest = {
        payload: 'base64encodedpayload',
        requestedSignatures: ["m/44'/501'/0'/0'", "m/44'/501'/0'/1'"],
      };

      expect(request.payload).toBe('base64encodedpayload');
      expect(request.requestedSignatures).toHaveLength(2);
      expect(request.requestedSignatures[0]).toBe("m/44'/501'/0'/0'");
    });

    it('should handle single derivation path', () => {
      const request: SigningRequest = {
        payload: 'base64encodedpayload',
        requestedSignatures: ["m/44'/501'/0'/0'"],
      };

      expect(request.requestedSignatures).toHaveLength(1);
    });
  });

  describe('SigningResult', () => {
    it('should create a valid SigningResult object', () => {
      const result: SigningResult = {
        signatures: ['signature1', 'signature2'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'", "m/44'/501'/0'/1'"],
      };

      expect(result.signatures).toHaveLength(2);
      expect(result.resolvedDerivationPaths).toHaveLength(2);
      expect(result.signatures[0]).toBe('signature1');
    });

    it('should handle single signature', () => {
      const result: SigningResult = {
        signatures: ['signature1'],
        resolvedDerivationPaths: ["m/44'/501'/0'/0'"],
      };

      expect(result.signatures).toHaveLength(1);
      expect(result.resolvedDerivationPaths).toHaveLength(1);
    });
  });

  describe('SeedPurpose', () => {
    it('should have correct values', () => {
      expect(SeedPurpose.SignSolanaTransaction).toBe(0);
    });

    it('should be readonly', () => {
      // @ts-expect-error - Testing readonly nature
      expect(() => (SeedPurpose.SignSolanaTransaction = 1)).toThrow();
    });
  });

  describe('DerivationPath', () => {
    it('should accept valid derivation paths', () => {
      const validPaths: DerivationPath[] = [
        "m/44'/501'/0'/0'",
        "m/44'/501'/0'/1'",
        "m/44'/501'/1'/0'",
      ];

      validPaths.forEach(path => {
        expect(typeof path).toBe('string');
        expect(path).toMatch(/^m\/\d+'?\/\d+'?\/\d+'?\/\d+'?$/);
      });
    });
  });
});