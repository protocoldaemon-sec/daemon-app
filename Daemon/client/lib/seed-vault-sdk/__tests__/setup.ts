/**
 * Test setup for Seed Vault SDK tests
 * Global test configuration and mocks
 */

import { vi } from 'vitest';

// Mock CustomEvent for jsdom
global.CustomEvent = class CustomEvent<T = any> extends Event {
  readonly detail: T;
  constructor(type: string, eventInitDict?: { detail?: T; bubbles?: boolean; cancelable?: boolean }) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
} as any;

// Mock window methods that might not be available in jsdom
Object.defineProperty(window, 'Android', {
  writable: true,
  value: {
    seedVaultIsAvailable: vi.fn(),
    seedVaultHasAuthorizedSeeds: vi.fn(),
    seedVaultAuthorizeSeed: vi.fn(),
    seedVaultGetAuthorizedSeeds: vi.fn(),
    seedVaultGetAccounts: vi.fn(),
    seedVaultSignTransaction: vi.fn(),
    seedVaultSignMessage: vi.fn(),
  },
});

// Mock btoa and atob for encoding tests
if (typeof global.btoa === 'undefined') {
  global.btoa = (str: string): string => Buffer.from(str, 'binary').toString('base64');
}

if (typeof global.atob === 'undefined') {
  global.atob = (b64: string): string => Buffer.from(b64, 'base64').toString('binary');
}

// Mock performance API
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
  } as any;
}

// Mock crypto for random number generation
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  } as any;
}

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  callback,
})) as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  callback,
})) as any;

// Set up test environment variables
vi.stubEnv('VITE_SEED_VAULT_LOG_LEVEL', 'error');
vi.stubEnv('VITE_SEED_VAULT_CLUSTER', 'devnet');
vi.stubEnv('VITE_SEED_VAULT_ENABLE_SIMULATOR', 'true');

// Mock console methods for cleaner test output
const originalConsole = { ...console };
beforeEach(() => {
  // Silence certain console methods in tests
  console.log = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
  // Keep warn and error for debugging
});

afterEach(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
  // Clear all mocks
  vi.clearAllMocks();
});