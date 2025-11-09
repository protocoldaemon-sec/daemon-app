# Enhanced Seed Vault SDK Integration

This directory contains the enhanced Seed Vault SDK integration for the Daemon Protocol app, combining the official Solana Mobile Seed Vault SDK with custom enhancements for both WebView (Capacitor) and React Native environments.

## Overview

The integration provides:

- **Official SDK Compatibility**: Full compatibility with the official Seed Vault SDK types and patterns
- **Dual Platform Support**: Works with both Android WebView (Capacitor) and React Native
- **Enhanced Features**: Additional utilities, configuration management, and error handling
- **TypeScript Support**: Full TypeScript type safety throughout
- **React Hooks**: Convenient React hooks for easy integration
- **Backward Compatibility**: Maintains compatibility with existing Seed Vault implementation

## Files Structure

```
seed-vault-sdk/
├── index.ts              # Main exports and utilities
├── official-types.ts     # Official Seed Vault SDK types
├── types.ts              # Enhanced API implementation
├── useSeedVault.ts       # React hooks for Seed Vault
├── utils.ts              # Utility functions and helpers
├── config.ts             # Configuration management
├── README.md             # This documentation
└── SeedVaultDemo.tsx     # Demo component (in components/)
```

## Installation

The official Seed Vault SDK is included as a dependency:

```bash
npm install @solana-mobile/seed-vault-lib@^0.4.0
```

## Android Permissions

The following permissions are added to `AndroidManifest.xml`:

```xml
<!-- Seed Vault Permissions -->
<uses-permission android:name="com.solanamobile.seedvault.ACCESS_SEED_VAULT" />
<uses-permission android:name="com.solanamobile.seedvault.ACCESS_SEED_VAULT_PRIVILEGED" android:maxSdkVersion="32" />
```

## Usage

### Basic Usage with React Hook

```tsx
import { useSeedVault } from '@/lib/seed-vault-sdk';

function MyComponent() {
  const {
    isAvailable,
    authorizedSeeds,
    accounts,
    authorizeNewSeed,
    signTransaction,
    signMessage,
    isLoading,
    error
  } = useSeedVault();

  const handleAuth = async () => {
    const seed = await authorizeNewSeed();
    if (seed) {
      console.log('Authorized seed:', seed.name);
    }
  };

  return (
    <div>
      {isAvailable ? (
        <div>
          <p>Seed Vault is available!</p>
          <button onClick={handleAuth} disabled={isLoading}>
            Authorize New Seed
          </button>
        </div>
      ) : (
        <p>Seed Vault not available</p>
      )}
    </div>
  );
}
```

### Advanced Usage with Direct API

```tsx
import { enhancedSeedVault, SOLANA_DERIVATION_PATHS } from '@/lib/seed-vault-sdk';

// Check availability
const available = await enhancedSeedVault.isSeedVaultAvailable(true);

// Authorize a new seed
const { authToken } = await enhancedSeedVault.authorizeNewSeed();

// Get accounts
const accounts = await enhancedSeedVault.getAccounts(authToken);

// Sign a transaction
const result = await enhancedSeedVault.signTransaction(
  authToken,
  transactionBase64,
  SOLANA_DERIVATION_PATHS.BIP44
);
```

### Configuration

```tsx
import { getSeedVaultConfig, SEED_VAULT_CONFIG } from '@/lib/seed-vault-sdk';

// Get environment-specific configuration
const config = getSeedVaultConfig();

// Use configuration values
const timeout = config.TIMEOUTS.AUTHORIZATION;
const errorMessage = config.ERROR_MESSAGES.NOT_AVAILABLE;
```

## API Reference

### Types

#### Core Types

- `Seed`: Represents an authorized seed
- `Account`: Represents a derived account
- `SeedPublicKey`: Public key with derivation path
- `SigningRequest`: Request for signing operations
- `SigningResult`: Result from signing operations

#### Configuration Types

- `SEED_PURPOSE`: Constants for seed purposes
- `SOLANA_DERIVATION_PATHS`: Pre-defined derivation paths

### Hooks

#### `useSeedVault()`

Main hook for Seed Vault operations.

**Returns:**
- `isAvailable`: boolean - Whether Seed Vault is available
- `authorizedSeeds`: Seed[] - List of authorized seeds
- `accounts`: Account[] - Accounts for current seed
- `currentSeed`: Seed | null - Currently selected seed
- `authorizeNewSeed()`: Promise<Seed | null> - Authorize a new seed
- `getAuthorizedSeeds()`: Promise<Seed[]> - Get all authorized seeds
- `getAccounts(authToken)`: Promise<Account[]> - Get accounts for seed
- `signTransaction(authToken, tx, path)`: Promise<SigningResult | null> - Sign transaction
- `signMessage(authToken, message, path)`: Promise<SigningResult | null> - Sign message
- `isLoading`: boolean - Loading state
- `error`: string | null - Error state

#### `useSeedVaultSigning(authToken)`

Specialized hook for signing operations.

**Returns:**
- `signTransaction(tx, path)`: Promise<SigningResult | null>
- `signMessage(msg, path)`: Promise<SigningResult | null>
- `getPublicKey(path)`: Promise<SeedPublicKey | null>
- `isLoading`: boolean
- `error`: string | null

### Enhanced API Class

#### `EnhancedSeedVaultAPI`

Enhanced API implementation supporting both WebView and React Native.

**Methods:**
- `isSeedVaultAvailable(allowSimulated)`: Promise<boolean>
- `authorizeNewSeed()`: Promise<{authToken: number}>
- `getAuthorizedSeeds()`: Promise<Seed[]>
- `getAccounts(authToken, filter?, value?)`: Promise<Account[]>
- `getPublicKey(authToken, derivationPath)`: Promise<SeedPublicKey>
- `signTransaction(authToken, derivationPath, transaction)`: Promise<SigningResult>
- `signMessage(authToken, derivationPath, message)`: Promise<SigningResult>
- `getApiType()`: 'react-native' | 'webview' | 'none'

### Utility Functions

- `validateTransaction(transaction)`: Validates transaction format
- `isValidBase64(str)`: Checks if string is valid Base64
- `isValidSolanaAddress(address)`: Validates Solana address
- `formatBalance(balance, decimals)`: Formats balance for display
- `getSolanaDerivationPath(account, change)`: Gets derivation path
- `estimateTransactionFee(signatures)`: Estimates transaction fee
- `retryOperation(operation, maxRetries, delay)`: Retries failed operations

## Configuration

### Environment-Specific Configuration

The configuration automatically adjusts based on environment:

```typescript
// Development
{
  ENABLE_SIMULATOR: true,
  LOG_LEVEL: 'debug',
  CLUSTER: 'devnet'
}

// Production
{
  ENABLE_SIMULATOR: false,
  LOG_LEVEL: 'info',
  CLUSTER: 'mainnet-beta'
}

// Test
{
  ENABLE_MOCK_DATA: true,
  LOG_LEVEL: 'error',
  TIMEOUTS: { ...shorter timeouts }
}
```

### Custom Configuration

You can override configuration by environment variables:

```bash
VITE_SEED_VAULT_LOG_LEVEL=debug
VITE_SEED_VAULT_CLUSTER=devnet
VITE_SEED_VAULT_ENABLE_SIMULATOR=true
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
try {
  const result = await enhancedSeedVault.authorizeNewSeed();
} catch (error) {
  // Error is already logged and formatted
  // Common errors:
  // - "Seed Vault is not available on this device"
  // - "Authorization timeout"
  // - "Permission to access Seed Vault was denied"
}
```

## Testing

### Mock Data

For testing, enable mock data:

```typescript
// In test environment
const config = getSeedVaultConfig();
// config.DEVELOPMENT.ENABLE_MOCK_DATA = true;
```

### Demo Component

Use the `SeedVaultDemo` component to test all features:

```tsx
import { SeedVaultDemo } from '@/components/SeedVaultDemo';

function App() {
  return <SeedVaultDemo />;
}
```

## Migration from Legacy Implementation

To migrate from the existing Seed Vault helper:

1. **Update imports:**
   ```typescript
   // Old
   import { seedVault } from '@/utils/seedVaultHelper';

   // New
   import { enhancedSeedVault } from '@/lib/seed-vault-sdk';
   ```

2. **Update method calls:**
   ```typescript
   // Old
   const result = await seedVault.authorizeSeed();

   // New
   const result = await enhancedSeedVault.authorizeNewSeed();
   ```

3. **Use React hooks for better state management:**
   ```typescript
   const { authorizeNewSeed, isLoading, error } = useSeedVault();
   ```

## Troubleshooting

### Common Issues

1. **Seed Vault not available**
   - Ensure Seed Vault Simulator is installed (development)
   - Check Android permissions in manifest
   - Verify device supports Seed Vault (Saga phones)

2. **Authorization timeout**
   - Increase timeout in configuration
   - Ensure user interaction is allowed
   - Check if Seed Vault app is responding

3. **No authorized seeds**
   - Call `authorizeNewSeed()` first
   - Check if authorization was completed by user
   - Verify app has proper permissions

### Debug Mode

Enable debug logging:

```typescript
const config = getSeedVaultConfig();
// Logs will appear in console
```

## Security Considerations

1. **Never expose private keys** - All signing happens in secure environment
2. **Validate all inputs** - Use provided validation functions
3. **Handle errors gracefully** - Don't expose sensitive information in error messages
4. **Use timeouts** - Prevent hanging operations
5. **Clear sensitive data** - Don't cache auth tokens longer than necessary

## References

- [Official Seed Vault SDK](https://github.com/solana-mobile/seed-vault-sdk)
- [Solana Mobile Documentation](https://docs.solanamobile.com/)
- [Mobile Wallet Adapter Spec](https://specs.solanamobile.com/mobile-wallet-adapter/spec)