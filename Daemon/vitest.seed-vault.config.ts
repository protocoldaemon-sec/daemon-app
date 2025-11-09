/**
 * Vitest configuration for Seed Vault tests
 * Custom test configuration for Seed Vault SDK testing
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./client/lib/seed-vault-sdk/__tests__/setup.ts'],

    // Test files pattern
    include: [
      'client/lib/seed-vault-sdk/**/*.{test,spec}.{js,ts,tsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'server',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'client/lib/seed-vault-sdk/**/*.{js,ts,tsx}',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Global variables
    globals: {
      vi: true,
    },

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});