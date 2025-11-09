/**
 * Error Reporting System for Mobile Wallet Operations
 * Comprehensive error tracking, analysis, and reporting
 */

import { mobileWalletLogger } from './mobileWalletLogger';
import { networkMonitor } from './networkMonitor';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error | string;
  context: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authorization' | 'connection' | 'signing' | 'network' | 'android' | 'ui' | 'unknown';
  deviceInfo: any;
  networkStatus: any;
  walletState: any;
  userAgent: string;
  sessionId: string;
  stackTrace?: string;
  additionalData?: any;
}

export interface ErrorStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: ErrorReport[];
  critical: ErrorReport[];
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private errors: ErrorReport[] = [];
  private maxErrors = 500;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    mobileWalletLogger.info('error-reporter', 'Error reporter initialized');
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(event.reason, 'unhandled-promise-rejection', 'high', 'unknown');
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || event.message, 'uncaught-error', 'critical', 'unknown');
    });
  }

  /**
   * Report an error with context
   */
  reportError(
    error: Error | string,
    context: string,
    severity: ErrorReport['severity'] = 'medium',
    category: ErrorReport['category'] = 'unknown',
    additionalData?: any
  ): string {
    const errorId = this.generateErrorId();
    const networkStatus = networkMonitor.getCurrentStatus();
    const walletState = this.getCurrentWalletState();

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      error,
      context,
      severity,
      category,
      deviceInfo: this.getDeviceInfo(),
      networkStatus,
      walletState,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      stackTrace: error instanceof Error ? error.stack : undefined,
      additionalData
    };

    this.errors.push(errorReport);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log the error
    mobileWalletLogger.error(category, `Error reported: ${context}`, {
      errorId,
      severity,
      error: error instanceof Error ? error.message : error,
      stackTrace: errorReport.stackTrace,
      additionalData
    });

    // Handle critical errors immediately
    if (severity === 'critical') {
      this.handleCriticalError(errorReport);
    }

    return errorId;
  }

  /**
   * Report a mobile wallet specific error
   */
  reportMobileWalletError(
    error: Error | string,
    operation: string,
    walletType?: string,
    additionalData?: any
  ): string {
    return this.reportError(
      error,
      `Mobile Wallet ${operation}`,
      this.determineSeverity(error, operation),
      'authorization',
      {
        operation,
        walletType,
        ...additionalData
      }
    );
  }

  /**
   * Report a network-related error
   */
  reportNetworkError(
    error: Error | string,
    operation: string,
    url?: string,
    additionalData?: any
  ): string {
    return this.reportError(
      error,
      `Network ${operation}`,
      this.determineSeverity(error, operation),
      'network',
      {
        operation,
        url,
        networkStatus: networkMonitor.getCurrentStatus(),
        ...additionalData
      }
    );
  }

  /**
   * Report an Android bridge error
   */
  reportAndroidError(
    error: Error | string,
    method: string,
    additionalData?: any
  ): string {
    return this.reportError(
      error,
      `Android Bridge ${method}`,
      this.determineSeverity(error, method),
      'android',
      {
        method,
        ...additionalData
      }
    );
  }

  /**
   * Determine error severity based on error type and context
   */
  private determineSeverity(error: Error | string, context: string): ErrorReport['severity'] {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : error.toLowerCase();
    const contextLower = context.toLowerCase();

    // Critical errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('crash') ||
      errorMessage.includes('security') ||
      contextLower.includes('authorization') && errorMessage.includes('failed')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('unavailable') ||
      contextLower.includes('signing') ||
      contextLower.includes('transaction')
    ) {
      return 'high';
    }

    // Medium severity errors
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('denied')
    ) {
      return 'medium';
    }

    // Default to low severity
    return 'low';
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(errorReport: ErrorReport): void {
    mobileWalletLogger.error('critical', 'Critical error detected', errorReport);

    // Try to recover if possible
    this.attemptRecovery(errorReport);

    // Could also send to external monitoring service here
    this.notifyCriticalError(errorReport);
  }

  /**
   * Attempt to recover from certain errors
   */
  private attemptRecovery(errorReport: ErrorReport): void {
    const errorId = errorReport.id;
    const attempts = this.retryAttempts.get(errorId) || 0;

    if (attempts >= this.maxRetries) {
      mobileWalletLogger.warn('recovery', `Max retries reached for error ${errorId}`);
      return;
    }

    this.retryAttempts.set(errorId, attempts + 1);

    const errorMessage = errorReport.error instanceof Error ? errorReport.error.message : errorReport.error;

    // Recovery strategies based on error type
    if (errorMessage.includes('network')) {
      mobileWalletLogger.info('recovery', 'Attempting network recovery');
      setTimeout(() => {
        networkMonitor.testConnectivity();
      }, 2000);
    }

    if (errorReport.context.includes('authorization')) {
      mobileWalletLogger.info('recovery', 'Attempting authorization recovery');
      // Could trigger reconnection attempt
    }
  }

  /**
   * Notify about critical errors (could send to monitoring service)
   */
  private notifyCriticalError(errorReport: ErrorReport): void {
    // In a real implementation, this could send to services like:
    // - Sentry
    // - Custom webhook
    // - Analytics service
    // - Email notification

    mobileWalletLogger.error('notification', 'Critical error notification sent', {
      errorId: errorReport.id,
      severity: errorReport.severity,
      context: errorReport.context
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(error => error.timestamp > last24Hours);
    const criticalErrors = this.errors.filter(error => error.severity === 'critical');

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCategory,
      bySeverity,
      recent: recentErrors.slice(-10),
      critical: criticalErrors.slice(-5)
    };
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorReport['category'], limit?: number): ErrorReport[] {
    let filtered = this.errors.filter(error => error.category === category);
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered.reverse();
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorReport['severity'], limit?: number): ErrorReport[] {
    let filtered = this.errors.filter(error => error.severity === severity);
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered.reverse();
  }

  /**
   * Clear error reports
   */
  clearErrors(): void {
    this.errors = [];
    this.retryAttempts.clear();
    mobileWalletLogger.info('error-reporter', 'Error reports cleared');
  }

  /**
   * Export error reports for analysis
   */
  exportErrors(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.getErrorStats(),
      errors: this.errors,
      summary: {
        total: this.errors.length,
        critical: this.errors.filter(e => e.severity === 'critical').length,
        high: this.errors.filter(e => e.severity === 'high').length,
        medium: this.errors.filter(e => e.severity === 'medium').length,
        low: this.errors.filter(e => e.severity === 'low').length
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Helper methods
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    // Try to get session ID from various sources
    const sessionId = (window as any).daemonSessionId ||
                     localStorage.getItem('daemon_session_id') ||
                     `session_${Date.now()}`;

    // Store for future use
    localStorage.setItem('daemon_session_id', sessionId);
    (window as any).daemonSessionId = sessionId;

    return sessionId;
  }

  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  private getCurrentWalletState(): any {
    // Try to get current wallet state from various sources
    return {
      connected: localStorage.getItem('wallet_address') !== null,
      walletType: localStorage.getItem('wallet_type'),
      address: localStorage.getItem('wallet_address'),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();

// Export convenience functions
export const reportError = (error: Error | string, context: string, severity?: ErrorReport['severity'], category?: ErrorReport['category'], additionalData?: any) =>
  errorReporter.reportError(error, context, severity, category, additionalData);

export const reportMobileWalletError = (error: Error | string, operation: string, walletType?: string, additionalData?: any) =>
  errorReporter.reportMobileWalletError(error, operation, walletType, additionalData);

export const reportNetworkError = (error: Error | string, operation: string, url?: string, additionalData?: any) =>
  errorReporter.reportNetworkError(error, operation, url, additionalData);

export const reportAndroidError = (error: Error | string, method: string, additionalData?: any) =>
  errorReporter.reportAndroidError(error, method, additionalData);