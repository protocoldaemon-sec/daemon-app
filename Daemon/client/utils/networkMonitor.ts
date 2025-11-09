/**
 * Network Connection Monitor
 * Monitors network status and connectivity for mobile wallet operations
 */

import { mobileWalletLogger } from './mobileWalletLogger';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  timestamp: Date;
}

export interface NetworkTestResult {
  url: string;
  success: boolean;
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isMonitoring = false;
  private currentStatus: NetworkStatus | null = null;
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private testUrls = [
    'https://api.mainnet-beta.solana.com',
    'https://api.devnet.solana.com',
    'https://google.com',
    'https://api.daemonprotocol.com'
  ];

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Get initial network status
    this.updateNetworkStatus();

    // Listen for network events
    window.addEventListener('online', () => {
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange(false);
    });

    // Listen for connection changes (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.updateNetworkStatus();
      });
    }

    mobileWalletLogger.info('network', 'Network monitor initialized');
  }

  private updateNetworkStatus(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const status: NetworkStatus = {
      isOnline: navigator.onLine,
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      timestamp: new Date()
    };

    this.currentStatus = status;
    this.notifyListeners(status);

    mobileWalletLogger.info('network', 'Network status updated', status);
  }

  private handleNetworkChange(isOnline: boolean): void {
    mobileWalletLogger.info('network', `Network status changed: ${isOnline ? 'online' : 'offline'}`);
    this.updateNetworkStatus();

    if (isOnline) {
      // Run connectivity tests when coming back online
      this.testConnectivity();
    }
  }

  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * Start continuous network monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateNetworkStatus();
    }, intervalMs);

    mobileWalletLogger.info('network', 'Started continuous monitoring', { intervalMs });
  }

  /**
   * Stop continuous network monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    mobileWalletLogger.info('network', 'Stopped continuous monitoring');
  }

  /**
   * Get current network status
   */
  getCurrentStatus(): NetworkStatus | null {
    return this.currentStatus;
  }

  /**
   * Test connectivity to multiple endpoints
   */
  async testConnectivity(): Promise<NetworkTestResult[]> {
    mobileWalletLogger.info('network', 'Starting connectivity tests');

    const results: NetworkTestResult[] = [];
    const promises = this.testUrls.map(url => this.testEndpoint(url));

    try {
      const testResults = await Promise.allSettled(promises);
      testResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            url: this.testUrls[index],
            success: false,
            error: result.reason?.message || 'Unknown error',
            timestamp: new Date()
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      mobileWalletLogger.info('network', 'Connectivity tests completed', {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
        results: results.map(r => ({
          url: r.url,
          success: r.success,
          responseTime: r.responseTime
        }))
      });

      return results;
    } catch (error) {
      mobileWalletLogger.error('network', 'Connectivity test failed', error);
      return [];
    }
  }

  /**
   * Test a single endpoint
   */
  private async testEndpoint(url: string): Promise<NetworkTestResult> {
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS issues
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      return {
        url,
        success: true,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        url,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Test connectivity to Solana endpoints specifically
   */
  async testSolanaConnectivity(): Promise<NetworkTestResult[]> {
    const solanaUrls = [
      'https://api.mainnet-beta.solana.com',
      'https://api.devnet.solana.com'
    ];

    mobileWalletLogger.info('network', 'Testing Solana connectivity');

    const results: NetworkTestResult[] = [];
    const promises = solanaUrls.map(url => this.testEndpoint(url));

    try {
      const testResults = await Promise.allSettled(promises);
      testResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            url: solanaUrls[index],
            success: false,
            error: result.reason?.message || 'Unknown error',
            timestamp: new Date()
          });
        }
      });

      mobileWalletLogger.info('network', 'Solana connectivity tests completed', {
        results: results.map(r => ({
          url: r.url,
          success: r.success,
          responseTime: r.responseTime
        }))
      });

      return results;
    } catch (error) {
      mobileWalletLogger.error('network', 'Solana connectivity test failed', error);
      return [];
    }
  }

  /**
   * Check if network conditions are suitable for wallet operations
   */
  isSuitableForWalletOps(): boolean {
    if (!this.currentStatus) {
      return false;
    }

    const { isOnline, effectiveType, saveData } = this.currentStatus;

    // Must be online
    if (!isOnline) {
      return false;
    }

    // Avoid slow connections for wallet operations
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return false;
    }

    // Avoid data saving mode for wallet operations
    if (saveData) {
      return false;
    }

    return true;
  }

  /**
   * Get network quality assessment
   */
  getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.currentStatus || !this.currentStatus.isOnline) {
      return 'offline';
    }

    const { effectiveType, downlink, rtt } = this.currentStatus;

    // Excellent: 4G+ with good speed and low latency
    if (effectiveType === '4g' && downlink && downlink > 2 && rtt && rtt < 150) {
      return 'excellent';
    }

    // Good: 4G or 3G with reasonable speed
    if ((effectiveType === '4g' || effectiveType === '3g') && downlink && downlink > 0.5) {
      return 'good';
    }

    // Fair: 3G or slow 4G
    if (effectiveType === '3g' || (effectiveType === '4g' && downlink && downlink <= 0.5)) {
      return 'fair';
    }

    // Poor: 2G or very slow connections
    if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      return 'poor';
    }

    // Default to fair if we can't determine
    return 'fair';
  }

  /**
   * Add listener for network status changes
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener for network status changes
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): any {
    return {
      isMonitoring: this.isMonitoring,
      currentStatus: this.currentStatus,
      networkQuality: this.getNetworkQuality(),
      suitableForWalletOps: this.isSuitableForWalletOps(),
      listenerCount: this.listeners.length
    };
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();

// Export convenience functions
export const startNetworkMonitoring = (intervalMs?: number) => networkMonitor.startMonitoring(intervalMs);
export const stopNetworkMonitoring = () => networkMonitor.stopMonitoring();
export const getNetworkStatus = () => networkMonitor.getCurrentStatus();
export const testNetworkConnectivity = () => networkMonitor.testConnectivity();
export const testSolanaConnectivity = () => networkMonitor.testSolanaConnectivity();
export const isNetworkSuitableForWalletOps = () => networkMonitor.isSuitableForWalletOps();
export const getNetworkQuality = () => networkMonitor.getNetworkQuality();