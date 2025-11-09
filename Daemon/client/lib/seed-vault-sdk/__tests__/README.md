# Seed Vault SDK Unit Tests

This directory contains comprehensive unit tests for the Seed Vault SDK integration.

## Test Structure

```
__tests__/
├── types.test.ts              # Type definitions and interfaces
├── enhanced-api.test.ts       # Enhanced API implementation
├── utils.test.ts              # Utility functions and helpers
├── use-seed-vault.test.tsx    # React hooks
├── config.test.ts             # Configuration management
├── setup.ts                   # Global test setup
└── README.md                  # This documentation
```

## Test Coverage

### Types (`types.test.ts`)
- ✅ Seed interface validation
- ✅ Account interface validation
- ✅ SeedPublicKey interface validation
- ✅ SigningRequest and SigningResult validation
- ✅ SeedPurpose constants
- ✅ DerivationPath validation

### Enhanced API (`enhanced-api.test.ts`)
- ✅ Environment detection (WebView vs React Native)
- ✅ Availability checking
- ✅ Seed authorization flow
- ✅ Account management
- ✅ Transaction and message signing
- ✅ Event handling
- ✅ Error handling
- ✅ Timeout management

### Utilities (`utils.test.ts`)
- ✅ Base64 validation and conversion
- ✅ Solana address validation
- ✅ Derivation path validation and generation
- ✅ Signing request creation
- ✅ Result parsing
- ✅ Display name formatting
- ✅ Account filtering and sorting
- ✅ Balance formatting
- ✅ Transaction validation
- ✅ Fee estimation
- ✅ Promise utilities (timeout, retry, debounce)

### React Hooks (`use-seed-vault.test.tsx`)
- ✅ Initial state management
- ✅ Availability checking
- ✅ Seed authorization
- ✅ Account management
- ✅ Transaction and message signing
- ✅ Error handling
- ✅ Loading states
- ✅ Auto-selection logic
- ✅ Data refresh functionality

### Configuration (`config.test.ts`)
- ✅ Default configuration values
- ✅ Environment-specific settings
- ✅ Environment variable overrides
- ✅ Configuration validation
- ✅ Security settings
- ✅ Derived constants

## Running Tests

### Run all Seed Vault tests
```bash
npm run test:seed-vault
```

### Run tests in watch mode
```bash
npm run test:seed-vault:watch
```

### Run tests with coverage
```bash
npm run test:seed-vault:coverage
```

### Run specific test file
```bash
npx vitest run client/lib/seed-vault-sdk/__tests__/types.test.ts
```

## Test Configuration

### Vitest Configuration (`vitest.seed-vault.config.ts`)
- Environment: jsdom
- Setup file: `setup.ts`
- Coverage thresholds: 80% for all metrics
- Test timeout: 10 seconds
- Hook timeout: 10 seconds

### Global Setup (`setup.ts`)
- Mocks window.Android interface
- Mocks CustomEvent for jsdom
- Mocks btoa/atob for encoding
- Mocks performance API
- Mocks crypto for random values
- Mocks IntersectionObserver and ResizeObserver
- Sets up test environment variables

## Mock Strategy

### Android Interface Mocking
```typescript
window.Android = {
  seedVaultIsAvailable: vi.fn(),
  seedVaultAuthorizeSeed: vi.fn(),
  // ... other methods
}
```

### React Native Detection
```typescript
// Mock navigator.product for React Native detection
Object.defineProperty(global.navigator, 'product', {
  value: 'ReactNative',
  writable: true,
});
```

### Async Operations
- Use `vi.fn().mockResolvedValue()` for successful operations
- Use `vi.fn().mockRejectedValue()` for failed operations
- Use `act()` from React Testing Library for state updates
- Use `waitFor()` for async assertions

## Test Patterns

### API Method Testing
```typescript
it('should handle successful operation', async () => {
  vi.mocked(enhancedSeedVault.someMethod).mockResolvedValue(mockResult);

  const result = await hook.current.someMethod();

  expect(result).toEqual(mockResult);
  expect(enhancedSeedVault.someMethod).toHaveBeenCalledWith(expectedArgs);
});
```

### Error Handling Testing
```typescript
it('should handle operation failure', async () => {
  vi.mocked(enhancedSeedVault.someMethod).mockRejectedValue(new Error('Test error'));

  await expect(hook.current.someMethod()).rejects.toThrow('Test error');
  expect(result.current.error).toBe('Test error');
});
```

### Loading State Testing
```typescript
it('should set loading state during operation', async () => {
  let resolvePromise: (value: any) => void;
  const promise = new Promise(resolve => {
    resolvePromise = resolve;
  });
  vi.mocked(enhancedSeedVault.someMethod).mockReturnValue(promise);

  const { result } = renderHook(() => useSeedVault());

  act(() => {
    result.current.someMethod();
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolvePromise(mockResult);
  });

  expect(result.current.isLoading).toBe(false);
});
```

## Coverage Requirements

Target coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Mock Consistency**: Use consistent mocking patterns across tests
3. **Edge Cases**: Test both success and failure scenarios
4. **Async Testing**: Properly handle async operations with `act()` and `waitFor()`
5. **Error Boundaries**: Test error handling and recovery
6. **Environment Testing**: Test both WebView and React Native environments
7. **Configuration Testing**: Test different environment configurations

## Debugging Tests

### Enable Debug Logging
```typescript
// In setup.ts
console.log = vi.fn(); // Re-enable for debugging
```

### Inspect Mock Calls
```typescript
console.log(vi.mocked(enhancedSeedVault.someMethod).mock.calls);
```

### Test State Inspection
```typescript
console.log(result.current);
```

## Continuous Integration

These tests are designed to run in CI/CD environments:
- ✅ No dependencies on external services
- ✅ Self-contained mocks
- ✅ Deterministic behavior
- ✅ Fast execution
- ✅ Clear error messages

## Future Improvements

1. **Integration Tests**: Add end-to-end tests with real Android WebView
2. **Performance Tests**: Add performance benchmarks
3. **Visual Regression Tests**: Add UI component snapshot tests
4. **Contract Tests**: Add API contract validation tests
5. **Accessibility Tests**: Add a11y compliance tests