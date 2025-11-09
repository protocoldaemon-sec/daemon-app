/**
 * Seed Vault Configuration
 * Central configuration for Seed Vault SDK integration
 */

export const SEED_VAULT_CONFIG = {
  // Timeouts (in milliseconds)
  TIMEOUTS: {
    AVAILABILITY_CHECK: 2000,
    AUTHORIZATION: 120000, // 2 minutes for user interaction
    GET_SEEDS: 5000,
    GET_ACCOUNTS: 5000,
    GET_PUBLIC_KEY: 3000,
    SIGN_TRANSACTION: 60000, // 1 minute for transaction signing
    SIGN_MESSAGE: 30000, // 30 seconds for message signing
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY_MS: 1000,
    MAX_DELAY_MS: 10000,
  },

  // Error messages
  ERROR_MESSAGES: {
    NOT_AVAILABLE: 'Seed Vault is not available on this device',
    PERMISSION_DENIED: 'Permission to access Seed Vault was denied',
    AUTHORIZATION_FAILED: 'Failed to authorize seed',
    AUTHORIZATION_TIMEOUT: 'Authorization timed out. Please make sure Seed Vault Simulator is installed and try again.',
    SIGNING_FAILED: 'Failed to sign transaction/message',
    SIGNING_TIMEOUT: 'Signing operation timed out',
    INVALID_TRANSACTION: 'Invalid transaction format',
    NO_AUTHORIZED_SEEDS: 'No authorized seeds found',
    SEED_VAULT_BUSY: 'Seed Vault is busy, please try again',
    NETWORK_ERROR: 'Network error occurred',
    UNKNOWN_ERROR: 'An unknown error occurred',
  },

  // App identity for Seed Vault
  APP_IDENTITY: {
    name: 'Daemon Protocol',
    uri: 'https://daemonprotocol.com',
    icon: '/icon-192.png', // Relative to app root
  },

  // Signing configuration
  SIGNING: {
    DEFAULT_DERIVATION_PATH: "m/44'/501'/0'/0'",
    CLUSTER: 'mainnet-beta', // Can be 'devnet', 'testnet', 'mainnet-beta'
    VALIDATE_TRANSACTIONS: true,
    SHOW_FEE_ESTIMATES: true,
  },

  // UI configuration
  UI: {
    SHOW_ACCOUNT_NAMES: true,
    SHOW_DERIVATION_PATHS: true,
    DEFAULT_ACCOUNT_NAME: 'Default Account',
    ENABLE_SEARCH: true,
    ENABLE_SORTING: true,
    ITEMS_PER_PAGE: 20,
  },

  // Security settings
  SECURITY: {
    REQUIRE_BIOMETRIC: false, // Let user decide
    CACHE_AUTH_TOKENS: true,
    CACHE_DURATION_MS: 3600000, // 1 hour
    VALIDATE_SIGNATURES: true,
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  },

  // Development settings
  DEVELOPMENT: {
    ENABLE_SIMULATOR: true,
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    ENABLE_MOCK_DATA: false,
    STRICT_MODE: true,
  },

  // Network configuration
  NETWORK: {
    SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
    WEBSOCKET_URL: 'wss://api.mainnet-beta.solana.com',
    COMMITMENT: 'confirmed',
    PREFLIGHT_COMMITMENT: 'confirmed',
  },
} as const;

// Environment-specific overrides
export function getSeedVaultConfig() {
  const isDevelopment = import.meta.env.DEV;
  const isTest = import.meta.env.MODE === 'test';

  if (isTest) {
    return {
      ...SEED_VAULT_CONFIG,
      DEVELOPMENT: {
        ...SEED_VAULT_CONFIG.DEVELOPMENT,
        ENABLE_MOCK_DATA: true,
        LOG_LEVEL: 'error',
      },
      TIMEOUTS: {
        ...SEED_VAULT_CONFIG.TIMEOUTS,
        AUTHORIZATION: 5000, // Shorter timeout for tests
        SIGN_TRANSACTION: 5000,
      },
    };
  }

  if (isDevelopment) {
    return {
      ...SEED_VAULT_CONFIG,
      DEVELOPMENT: {
        ...SEED_VAULT_CONFIG.DEVELOPMENT,
        ENABLE_SIMULATOR: true,
        LOG_LEVEL: 'debug',
      },
      NETWORK: {
        ...SEED_VAULT_CONFIG.NETWORK,
        SOLANA_RPC_URL: 'https://api.devnet.solana.com',
        WEBSOCKET_URL: 'wss://api.devnet.solana.com',
      },
      SIGNING: {
        ...SEED_VAULT_CONFIG.SIGNING,
        CLUSTER: 'devnet',
      },
    };
  }

  return SEED_VAULT_CONFIG;
}

// Export convenience constants
export const { TIMEOUTS, ERROR_MESSAGES, APP_IDENTITY, SIGNING, UI } = getSeedVaultConfig();