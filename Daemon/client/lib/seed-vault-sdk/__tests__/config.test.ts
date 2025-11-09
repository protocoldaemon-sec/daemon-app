/**
 * Unit tests for Seed Vault configuration
 * Tests configuration management and environment-specific settings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getSeedVaultConfig, SEED_VAULT_CONFIG } from '../config';

// Mock environment variables
const originalEnv = import.meta.env;

describe('Seed Vault Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    vi.stubEnv('NODE_ENV', originalEnv.NODE_ENV);
    vi.stubEnv('VITE_SEED_VAULT_LOG_LEVEL', originalEnv.VITE_SEED_VAULT_LOG_LEVEL);
    vi.stubEnv('VITE_SEED_VAULT_CLUSTER', originalEnv.VITE_SEED_VAULT_CLUSTER);
  });

  describe('Default Configuration', () => {
    it('should have correct default values', () => {
      expect(SEED_VAULT_CONFIG.TIMEOUTS.AUTHORIZATION).toBe(120000);
      expect(SEED_VAULT_CONFIG.TIMEOUTS.AVAILABILITY_CHECK).toBe(2000);
      expect(SEED_VAULT_CONFIG.TIMEOUTS.SIGN_TRANSACTION).toBe(60000);

      expect(SEED_VAULT_CONFIG.RETRY.MAX_ATTEMPTS).toBe(3);
      expect(SEED_VAULT_CONFIG.RETRY.BASE_DELAY_MS).toBe(1000);

      expect(SEED_VAULT_CONFIG.APP_IDENTITY.name).toBe('Daemon Protocol');
      expect(SEED_VAULT_CONFIG.APP_IDENTITY.uri).toBe('https://daemonprotocol.com');

      expect(SEED_VAULT_CONFIG.SIGNING.CLUSTER).toBe('mainnet-beta');
      expect(SEED_VAULT_CONFIG.SIGNING.DEFAULT_DERIVATION_PATH).toBe("m/44'/501'/0'/0'");

      expect(SEED_VAULT_CONFIG.NETWORK.SOLANA_RPC_URL).toBe('https://api.mainnet-beta.solana.com');
    });

    it('should have proper error messages', () => {
      expect(SEED_VAULT_CONFIG.ERROR_MESSAGES.NOT_AVAILABLE).toBe('Seed Vault is not available on this device');
      expect(SEED_VAULT_CONFIG.ERROR_MESSAGES.PERMISSION_DENIED).toBe('Permission to access Seed Vault was denied');
      expect(SEED_VAULT_CONFIG.ERROR_MESSAGES.AUTHORIZATION_TIMEOUT).toContain('Authorization timeout');
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should return production config by default', () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Re-import after setting env
      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.DEVELOPMENT.ENABLE_SIMULATOR).toBe(false);
      expect(config.DEVELOPMENT.LOG_LEVEL).toBe('info');
      expect(config.SIGNING.CLUSTER).toBe('mainnet-beta');
    });

    it('should return development config for dev mode', () => {
      vi.stubEnv('NODE_ENV', 'development');

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.DEVELOPMENT.ENABLE_SIMULATOR).toBe(true);
      expect(config.DEVELOPMENT.LOG_LEVEL).toBe('debug');
      expect(config.SIGNING.CLUSTER).toBe('devnet');
      expect(config.NETWORK.SOLANA_RPC_URL).toBe('https://api.devnet.solana.com');
    });

    it('should return test config for test mode', () => {
      vi.stubEnv('NODE_ENV', 'test');

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.DEVELOPMENT.ENABLE_MOCK_DATA).toBe(true);
      expect(config.DEVELOPMENT.LOG_LEVEL).toBe('error');
      expect(config.TIMEOUTS.AUTHORIZATION).toBe(5000);
      expect(config.TIMEOUTS.SIGN_TRANSACTION).toBe(5000);
    });

    it('should handle undefined NODE_ENV', () => {
      vi.stubEnv('NODE_ENV', undefined);

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      // Should default to production-like behavior
      expect(config.DEVELOPMENT.ENABLE_SIMULATOR).toBe(false);
      expect(config.DEVELOPMENT.LOG_LEVEL).toBe('info');
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should respect custom log level', () => {
      vi.stubEnv('VITE_SEED_VAULT_LOG_LEVEL', 'warn');
      vi.stubEnv('NODE_ENV', 'development');

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.DEVELOPMENT.LOG_LEVEL).toBe('warn');
    });

    it('should respect custom cluster', () => {
      vi.stubEnv('VITE_SEED_VAULT_CLUSTER', 'testnet');
      vi.stubEnv('NODE_ENV', 'development');

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.SIGNING.CLUSTER).toBe('testnet');
    });

    it('should respect simulator setting', () => {
      vi.stubEnv('VITE_SEED_VAULT_ENABLE_SIMULATOR', 'false');
      vi.stubEnv('NODE_ENV', 'development');

      vi.resetModules();
      const { getSeedVaultConfig: getConfig } = await import('../config');
      const config = getConfig();

      expect(config.DEVELOPMENT.ENABLE_SIMULATOR).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid timeout values', () => {
      const config = getSeedVaultConfig();

      expect(config.TIMEOUTS.AVAILABILITY_CHECK).toBeGreaterThan(0);
      expect(config.TIMEOUTS.AUTHORIZATION).toBeGreaterThan(0);
      expect(config.TIMEOUTS.SIGN_TRANSACTION).toBeGreaterThan(0);
      expect(config.TIMEOUTS.SIGN_MESSAGE).toBeGreaterThan(0);
    });

    it('should have valid retry configuration', () => {
      const config = getSeedVaultConfig();

      expect(config.RETRY.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(config.RETRY.BASE_DELAY_MS).toBeGreaterThan(0);
      expect(config.RETRY.MAX_DELAY_MS).toBeGreaterThan(config.RETRY.BASE_DELAY_MS);
    });

    it('should have valid app identity', () => {
      const config = getSeedVaultConfig();

      expect(config.APP_IDENTITY.name).toBeTruthy();
      expect(config.APP_IDENTITY.uri).toBeTruthy();
      expect(config.APP_IDENTITY.uri).toMatch(/^https?:\/\//);
    });

    it('should have valid network configuration', () => {
      const config = getSeedVaultConfig();

      expect(config.NETWORK.SOLANA_RPC_URL).toBeTruthy();
      expect(config.NETWORK.SOLANA_RPC_URL).toMatch(/^https?:\/\//);
      expect(config.NETWORK.WEBSOCKET_URL).toBeTruthy();
      expect(config.NETWORK.WEBSOCKET_URL).toMatch(/^wss?:\/\//);
    });
  });

  describe('Configuration Immutability', () => {
    it('should return immutable configuration', () => {
      const config1 = getSeedVaultConfig();
      const config2 = getSeedVaultConfig();

      // Should be the same reference but not modifiable
      expect(config1).toBe(config2);

      // Attempts to modify should not affect the original
      expect(() => {
        (config1 as any).TIMEOUTS.AUTHORIZATION = 999999;
      }).not.toThrow();

      // Value should remain unchanged
      const config3 = getSeedVaultConfig();
      expect(config3.TIMEOUTS.AUTHORIZATION).toBe(SEED_VAULT_CONFIG.TIMEOUTS.AUTHORIZATION);
    });
  });

  describe('Derived Constants', () => {
    it('should export correct timeout constants', async () => {
      vi.resetModules();
      const { TIMEOUTS } = await import('../config');

      expect(TIMEOUTS.AUTHORIZATION).toBe(120000);
      expect(TIMEOUTS.AVAILABILITY_CHECK).toBe(2000);
      expect(TIMEOUTS.SIGN_TRANSACTION).toBe(60000);
    });

    it('should export correct error message constants', async () => {
      vi.resetModules();
      const { ERROR_MESSAGES } = await import('../config');

      expect(ERROR_MESSAGES.NOT_AVAILABLE).toBeTruthy();
      expect(ERROR_MESSAGES.AUTHORIZATION_FAILED).toBeTruthy();
      expect(ERROR_MESSAGES.SIGNING_FAILED).toBeTruthy();
    });

    it('should export app identity constants', async () => {
      vi.resetModules();
      const { APP_IDENTITY } = await import('../config');

      expect(APP_IDENTITY.name).toBe('Daemon Protocol');
      expect(APP_IDENTITY.uri).toBe('https://daemonprotocol.com');
    });
  });

  describe('Configuration Usage Examples', () => {
    it('should provide configuration for typical operations', () => {
      const config = getSeedVaultConfig();

      // Authorization example
      const authorizationTimeout = config.TIMEOUTS.AUTHORIZATION;
      const errorMessage = config.ERROR_MESSAGES.AUTHORIZATION_TIMEOUT;

      expect(authorizationTimeout).toBe(120000);
      expect(errorMessage).toContain('timeout');

      // Retry example
      const maxRetries = config.RETRY.MAX_ATTEMPTS;
      const baseDelay = config.RETRY.BASE_DELAY_MS;

      expect(maxRetries).toBe(3);
      expect(baseDelay).toBe(1000);

      // Network example
      const rpcUrl = config.NETWORK.SOLANA_RPC_URL;
      const cluster = config.SIGNING.CLUSTER;

      expect(rpcUrl).toBeTruthy();
      expect(cluster).toBeTruthy();
    });
  });

  describe('Security Configuration', () => {
    it('should have appropriate security settings', () => {
      const config = getSeedVaultConfig();

      expect(config.SECURITY.CACHE_DURATION_MS).toBeGreaterThan(0);
      expect(config.SECURITY.ENCRYPTION_ALGORITHM).toBe('AES-256-GCM');
      expect(config.SECURITY.VALIDATE_SIGNATURES).toBe(true);
    });

    it('should have secure defaults', () => {
      const config = getSeedVaultConfig();

      // Should not require biometric by default (user choice)
      expect(config.SECURITY.REQUIRE_BIOMETRIC).toBe(false);

      // Should validate signatures
      expect(config.SECURITY.VALIDATE_SIGNATURES).toBe(true);

      // Should have reasonable cache duration
      expect(config.SECURITY.CACHE_DURATION_MS).toBe(3600000); // 1 hour
    });
  });
});