/**
 * Seed Vault Demo Component
 * Demonstrates the enhanced Seed Vault SDK integration
 *
 * This component showcases the new features added from the official Seed Vault SDK
 * including improved error handling, transaction signing, and account management.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Wallet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import {
  useSeedVault,
  useSeedVaultSigning,
  enhancedSeedVault,
  SEED_PURPOSE,
  SOLANA_DERIVATION_PATHS,
  getSeedVaultConfig,
  formatBalance,
  getAccountDisplayName,
  validateTransaction,
  estimateTransactionFee,
  type Seed,
  type Account,
  type SigningResult
} from '@/lib/seed-vault-sdk';

export function SeedVaultDemo() {
  const {
    isAvailable,
    isLoading,
    error,
    authorizedSeeds,
    accounts,
    currentSeed,
    apiType,
    checkAvailability,
    authorizeNewSeed,
    getAuthorizedSeeds,
    getAccounts,
    getPublicKey,
    signTransaction,
    signMessage,
    refreshData,
    clearError,
  } = useSeedVault();

  const [selectedSeed, setSelectedSeed] = useState<Seed | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactionToSign, setTransactionToSign] = useState('');
  const [messageToSign, setMessageToSign] = useState('Hello from Daemon Protocol!');
  const [signingResult, setSigningResult] = useState<SigningResult | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const signingHook = useSeedVaultSigning(selectedSeed?.authToken || null);

  // Initialize data on mount
  useEffect(() => {
    if (isAvailable) {
      refreshData();
    }
  }, [isAvailable, refreshData]);

  // Auto-select first seed if available
  useEffect(() => {
    if (authorizedSeeds.length > 0 && !selectedSeed) {
      setSelectedSeed(authorizedSeeds[0]);
    }
  }, [authorizedSeeds, selectedSeed]);

  // Load accounts when seed is selected
  useEffect(() => {
    if (selectedSeed) {
      getAccounts(selectedSeed.authToken);
    }
  }, [selectedSeed, getAccounts]);

  // Auto-select first account if available
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const handleAuthorizeSeed = async () => {
    clearError();
    const seed = await authorizeNewSeed();
    if (seed) {
      setSelectedSeed(seed);
    }
  };

  const handleSignTransaction = async () => {
    if (!selectedSeed || !transactionToSign.trim()) return;

    setIsSigning(true);
    clearError();

    try {
      // Validate transaction
      const validation = validateTransaction(transactionToSign);
      if (!validation.isValid) {
        throw new Error(validation.errorMessage);
      }

      // Sign transaction
      const result = await signTransaction(
        selectedSeed.authToken,
        transactionToSign,
        SOLANA_DERIVATION_PATHS.BIP44
      );

      if (result) {
        setSigningResult(result);
      }
    } catch (err) {
      console.error('Transaction signing failed:', err);
    } finally {
      setIsSigning(false);
    }
  };

  const handleSignMessage = async () => {
    if (!selectedSeed || !messageToSign.trim()) return;

    setIsSigning(true);
    clearError();

    try {
      // Convert message to base64
      const messageBase64 = btoa(messageToSign);

      const result = await signMessage(
        selectedSeed.authToken,
        messageBase64,
        SOLANA_DERIVATION_PATHS.BIP44
      );

      if (result) {
        setSigningResult(result);
      }
    } catch (err) {
      console.error('Message signing failed:', err);
    } finally {
      setIsSigning(false);
    }
  };

  const formatAuthToken = (authToken: number): string => {
    return authToken.toString().substring(0, 8) + '...';
  };

  const getApiTypeDisplay = () => {
    switch (apiType) {
      case 'react-native':
        return 'React Native';
      case 'webview':
        return 'Android WebView';
      case 'none':
        return 'Not Available';
      default:
        return 'Unknown';
    }
  };

  const getApiTypeColor = () => {
    switch (apiType) {
      case 'react-native':
        return 'bg-blue-100 text-blue-800';
      case 'webview':
        return 'bg-green-100 text-green-800';
      case 'none':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Key className="h-8 w-8" />
          Seed Vault Integration Demo
        </h1>
        <p className="text-muted-foreground">
          Enhanced Seed Vault SDK with official integration patterns
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Seed Vault Status
            <Badge className={getApiTypeColor()}>
              {getApiTypeDisplay()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Current Seed Vault availability and API type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {isAvailable ? 'Available' : 'Not Available'}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={checkAvailability}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Check Availability'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Authorization Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Seed Authorization
          </CardTitle>
          <CardDescription>
            Authorize seeds for use with the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>
              {authorizedSeeds.length} authorized seed(s) found
            </span>
            <Button onClick={handleAuthorizeSeed} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Authorize New Seed
            </Button>
          </div>

          {/* Seed Selection */}
          {authorizedSeeds.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Available Seeds:</h4>
              <div className="grid gap-2">
                {authorizedSeeds.map((seed) => (
                  <div
                    key={seed.authToken}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSeed?.authToken === seed.authToken
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedSeed(seed)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{seed.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Auth Token: {formatAuthToken(seed.authToken)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        Purpose: {seed.purpose === SEED_PURPOSE.SIGN_SOLANA_TRANSACTION ? 'Solana' : 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accounts Section */}
      {selectedSeed && (
        <Card>
          <CardHeader>
            <CardTitle>Accounts for {selectedSeed.name}</CardTitle>
            <CardDescription>
              Derived accounts from the selected seed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length > 0 ? (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAccount?.id === account.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedAccount(account)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {getAccountDisplayName(account)}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {account.publicKeyEncoded.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.derivationPath}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          Account #{account.id}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No accounts found for this seed
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Signing Section */}
      {selectedSeed && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction & Message Signing</CardTitle>
            <CardDescription>
              Sign transactions and messages with the selected seed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transaction Signing */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction (Base64):</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter base64-encoded transaction..."
                  value={transactionToSign}
                  onChange={(e) => setTransactionToSign(e.target.value)}
                  disabled={isSigning}
                />
                <Button
                  onClick={handleSignTransaction}
                  disabled={!transactionToSign.trim() || isSigning}
                >
                  {isSigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign Transaction'
                  )}
                </Button>
              </div>
            </div>

            {/* Message Signing */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message to Sign:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter message to sign..."
                  value={messageToSign}
                  onChange={(e) => setMessageToSign(e.target.value)}
                  disabled={isSigning}
                />
                <Button
                  variant="outline"
                  onClick={handleSignMessage}
                  disabled={!messageToSign.trim() || isSigning}
                >
                  {isSigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sign Message'
                  )}
                </Button>
              </div>
            </div>

            {/* Signing Result */}
            {signingResult && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <h4 className="font-medium">Signing Result:</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Signatures: </span>
                    {signingResult.signatures.length} signature(s)
                  </div>
                  {signingResult.resolvedDerivationPaths && (
                    <div>
                      <span className="font-medium">Resolved Paths: </span>
                      {signingResult.resolvedDerivationPaths.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fee Estimate */}
            <div className="text-sm text-muted-foreground">
              Estimated fee: {formatBalance(estimateTransactionFee())} SOL
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Development debug information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div>API Type: {apiType}</div>
            <div>Is Available: {isAvailable.toString()}</div>
            <div>Authorized Seeds: {authorizedSeeds.length}</div>
            <div>Accounts: {accounts.length}</div>
            <div>Selected Seed: {selectedSeed ? selectedSeed.name : 'None'}</div>
            <div>Selected Account: {selectedAccount ? selectedAccount.name : 'None'}</div>
            <div>Error: {error || 'None'}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}