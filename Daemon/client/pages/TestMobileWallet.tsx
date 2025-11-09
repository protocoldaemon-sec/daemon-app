/**
 * Test Page for Enhanced Mobile Wallet Adapter
 * Use this page to verify the integration is working correctly
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Zap,
  Wifi,
  WifiOff,
  Info,
  TestTube,
  Bug
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useEnhancedMobileWallet, useMobileWalletAvailability, useMobileWalletCapabilities } from '@/hooks/useEnhancedMobileWallet';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function TestMobileWallet() {
  const { isDark } = useTheme();
  const { toast } = useToast();

  // Enhanced mobile wallet hooks
  const enhancedMobile = useEnhancedMobileWallet();
  const { isSupported: isMobileSupported } = useMobileWalletAvailability();
  const { capabilities, isLoading: capabilitiesLoading, error: capabilitiesError } = useMobileWalletCapabilities();

  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    timestamp: Date;
  }>>([]);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const runBasicTests = async () => {
    setTestResults([]);

    // Test 1: Check if MWA is supported
    if (isMobileSupported) {
      addTestResult('MWA Support Check', 'success', 'Mobile Wallet Adapter is supported');
    } else {
      addTestResult('MWA Support Check', 'error', 'Mobile Wallet Adapter not supported');
    }

    // Test 2: Check if adapter is available
    if (enhancedMobile.isAvailable) {
      addTestResult('Adapter Availability', 'success', 'Enhanced Mobile Wallet Adapter is available');
    } else {
      addTestResult('Adapter Availability', 'error', 'Enhanced Mobile Wallet Adapter not available');
    }

    // Test 3: Check authorization state
    if (enhancedMobile.isAuthorized) {
      addTestResult('Authorization State', 'success', 'Wallet is authorized');
    } else {
      addTestResult('Authorization State', 'error', 'Wallet not authorized');
    }

    // Test 4: Check capabilities
    if (capabilities) {
      addTestResult('Capabilities Load', 'success', `Loaded ${capabilities.supportedFeatures.length} features`);
    } else if (capabilitiesError) {
      addTestResult('Capabilities Load', 'error', capabilitiesError);
    } else {
      addTestResult('Capabilities Load', 'error', 'Capabilities not loaded');
    }
  };

  const runConnectionTest = async () => {
    try {
      addTestResult('Connection Test', 'pending', 'Starting connection test...');

      await enhancedMobile.connect();
      addTestResult('Connection Test', 'success', 'Wallet connected successfully');

      toast({
        title: "Connection Test Successful",
        description: "Mobile wallet connection test passed!",
      });
    } catch (error: any) {
      addTestResult('Connection Test', 'error', error.message);

      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const runMessageSigningTest = async () => {
    if (!enhancedMobile.isAuthorized) {
      addTestResult('Message Signing Test', 'error', 'Wallet not authorized - connect first');
      return;
    }

    try {
      addTestResult('Message Signing Test', 'pending', 'Starting message signing test...');

      const testMessage = `Test message from Daemon App at ${new Date().toISOString()}`;
      const signature = await enhancedMobile.signMessage(testMessage);

      if (signature && signature.length > 0) {
        addTestResult('Message Signing Test', 'success', `Message signed successfully (${signature.length} bytes)`);

        toast({
          title: "Signing Test Successful",
          description: "Message was signed successfully!",
        });
      } else {
        addTestResult('Message Signing Test', 'error', 'Invalid signature returned');
      }
    } catch (error: any) {
      addTestResult('Message Signing Test', 'error', error.message);

      toast({
        title: "Signing Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const runDisconnectionTest = async () => {
    try {
      addTestResult('Disconnection Test', 'pending', 'Starting disconnection test...');

      await enhancedMobile.disconnect();
      addTestResult('Disconnection Test', 'success', 'Wallet disconnected successfully');

      toast({
        title: "Disconnection Test Successful",
        description: "Mobile wallet disconnection test passed!",
      });
    } catch (error: any) {
      addTestResult('Disconnection Test', 'error', error.message);

      toast({
        title: "Disconnection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 mb-4">
              <TestTube className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Mobile Wallet Adapter Test</h1>
              <Bug className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">
              Test the enhanced Mobile Wallet Adapter integration
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={cn(
              "border-2",
              isMobileSupported
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-red-500/30 bg-red-50/30 dark:bg-red-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {isMobileSupported ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h3 className="font-semibold">MWA Support</h3>
                    <p className="text-sm text-muted-foreground">
                      {isMobileSupported ? 'Supported' : 'Not Supported'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              enhancedMobile.isAvailable
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-red-500/30 bg-red-50/30 dark:bg-red-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {enhancedMobile.isAvailable ? (
                    <Shield className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h3 className="font-semibold">Adapter Available</h3>
                    <p className="text-sm text-muted-foreground">
                      {enhancedMobile.isAvailable ? 'Available' : 'Not Available'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              enhancedMobile.isAuthorized
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {enhancedMobile.isAuthorized ? (
                    <Zap className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  )}
                  <div>
                    <h3 className="font-semibold">Authorization</h3>
                    <p className="text-sm text-muted-foreground">
                      {enhancedMobile.isAuthorized ? 'Authorized' : 'Not Authorized'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Info */}
          {enhancedMobile.wallet && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Connected Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Address:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {enhancedMobile.walletDisplayInfo?.truncatedAddress}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Type:</span>
                  <Badge variant="secondary">{enhancedMobile.wallet.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Chain:</span>
                  <Badge variant="outline">{enhancedMobile.walletDisplayInfo?.chainName}</Badge>
                </div>
                {enhancedMobile.wallet.label && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Label:</span>
                    <span className="text-sm">{enhancedMobile.wallet.label}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Capabilities */}
          {capabilities && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Wallet Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Supported Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.supportedFeatures.map((feature: string) => (
                        <Badge key={feature} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Supported Chains:</h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.supportedChains.map((chain: string) => (
                        <Badge key={chain} variant="secondary" className="text-xs">
                          {chain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      {capabilities.supportsSignInWithSolana ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span>SIWS Support</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Max Transactions:</span>
                      <span className="font-mono">{capabilities.maxTransactionsPerRequest}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {enhancedMobile.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {enhancedMobile.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Controls
              </CardTitle>
              <CardDescription>
                Run tests to verify the mobile wallet adapter functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Tests</TabsTrigger>
                  <TabsTrigger value="integration">Integration Tests</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={runBasicTests} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Run Basic Tests
                    </Button>
                    <Button onClick={clearResults} variant="ghost">
                      Clear Results
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="integration" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={runConnectionTest}
                      disabled={enhancedMobile.isConnecting}
                    >
                      {enhancedMobile.isConnecting ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button
                      onClick={runMessageSigningTest}
                      disabled={!enhancedMobile.isAuthorized}
                      variant="outline"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Test Message Signing
                    </Button>
                    <Button
                      onClick={runDisconnectionTest}
                      disabled={!enhancedMobile.isAuthorized}
                      variant="outline"
                    >
                      <WifiOff className="w-4 h-4 mr-2" />
                      Test Disconnection
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Test Results
                  </span>
                  <Button onClick={clearResults} variant="ghost" size="sm">
                    Clear
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        result.status === 'success'
                          ? "bg-green-50/50 border-green-200/50 dark:bg-green-950/50 dark:border-green-800/50"
                          : result.status === 'error'
                          ? "bg-red-50/50 border-red-200/50 dark:bg-red-950/50 dark:border-red-800/50"
                          : "bg-yellow-50/50 border-yellow-200/50 dark:bg-yellow-950/50 dark:border-yellow-800/50"
                      )}
                    >
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : result.status === 'error' ? (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0 animate-spin" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{result.test}</h4>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}