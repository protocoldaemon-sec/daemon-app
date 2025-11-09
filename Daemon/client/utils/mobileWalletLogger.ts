/**
 * Enhanced Mobile Wallet Logger for Debugging
 * Comprehensive logging system for mobile wallet adapter operations
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'mwa' | 'authorization' | 'connection' | 'signing' | 'android' | 'ui' | 'performance';
  message: string;
  data?: any;
  stack?: string;
  sessionId: string;
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isAndroid: boolean;
  isSolanaSeeker: boolean;
  deviceId?: string;
  appVersion: string;
}

export interface NetworkInfo {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

class MobileWalletLogger {
  private static instance: MobileWalletLogger;
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private sessionId: string;
  private deviceInfo: DeviceInfo;
  private maxLogs = 1000; // Keep last 1000 logs
  private isDebugMode = process.env.NODE_ENV === 'development';

  static getInstance(): MobileWalletLogger {
    if (!MobileWalletLogger.instance) {
      MobileWalletLogger.instance = new MobileWalletLogger();
    }
    return MobileWalletLogger.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceInfo = this.collectDeviceInfo();
    this.log('info', 'system', 'Logger initialized', {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      timestamp: new Date().toISOString()
    });

    // Listen for visibility changes to log app state
    document.addEventListener('visibilitychange', () => {
      this.log('info', 'ui', `App visibility changed to: ${document.visibilityState}`);
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.log('info', 'network', 'Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.log('warn', 'network', 'Network connection lost');
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isSolanaSeeker = /Seeker|Solana Mobile/i.test(userAgent);

    return {
      userAgent,
      platform: navigator.platform,
      isMobile,
      isAndroid,
      isSolanaSeeker,
      appVersion: this.getAppVersion(),
    };
  }

  private getAppVersion(): string {
    // Try to get version from various sources
    const metaVersion = document.querySelector('meta[name="version"]')?.getAttribute('content');
    if (metaVersion) return metaVersion;

    // Fallback to a default version
    return '1.0.0';
  }

  log(level: LogEntry['level'], category: LogEntry['category'], message: string, data?: any): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
    };

    // Add stack trace for errors
    if (level === 'error' && data instanceof Error) {
      entry.stack = data.stack;
      entry.data = {
        error: data.message,
        name: data.name,
        ...data
      };
    }

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development mode
    if (this.isDebugMode) {
      this.consoleLog(entry);
    }

    // Android bridge logging
    this.androidLog(entry);
  }

  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.category.toUpperCase()}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data);
        break;
      case 'info':
        console.info(message, entry.data);
        break;
      case 'warn':
        console.warn(message, entry.data);
        break;
      case 'error':
        console.error(message, entry.data);
        break;
    }
  }

  private androidLog(entry: LogEntry): void {
    try {
      const logData = {
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        category: entry.category,
        message: entry.message,
        data: entry.data,
        sessionId: entry.sessionId,
      };

      // Send to Android bridge if available
      if (typeof (window as any).Android !== 'undefined') {
        const logMessage = `[${entry.category}] ${entry.message}`;
        switch (entry.level) {
          case 'debug':
          case 'info':
            if (typeof (window as any).Android.log === 'function') {
              (window as any).Android.log(logMessage, JSON.stringify(logData));
            }
            break;
          case 'warn':
            if (typeof (window as any).Android.logWarning === 'function') {
              (window as any).Android.logWarning(logMessage, JSON.stringify(logData));
            }
            break;
          case 'error':
            if (typeof (window as any).Android.logError === 'function') {
              (window as any).Android.logError(logMessage, JSON.stringify(logData));
            }
            break;
        }
      }
    } catch (error) {
      console.warn('Failed to send log to Android bridge:', error);
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convenience methods
  debug(category: LogEntry['category'], message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  info(category: LogEntry['category'], message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  warn(category: LogEntry['category'], message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  error(category: LogEntry['category'], message: string, data?: any): void {
    this.log('error', category, message, data);
  }

  // Mobile wallet specific logging methods
  logMWAOperation(operation: string, data?: any): void {
    this.info('mwa', `MWA Operation: ${operation}`, data);
  }

  logAuthorizationStep(step: string, data?: any): void {
    this.info('authorization', `Authorization Step: ${step}`, data);
  }

  logConnectionAttempt(walletType: string, data?: any): void {
    this.info('connection', `Connection Attempt: ${walletType}`, data);
  }

  logSigningOperation(operation: string, data?: any): void {
    this.info('signing', `Signing Operation: ${operation}`, data);
  }

  logAndroidBridge(method: string, data?: any): void {
    this.debug('android', `Android Bridge: ${method}`, data);
  }

  logUIEvent(event: string, data?: any): void {
    this.debug('ui', `UI Event: ${event}`, data);
  }

  // Performance monitoring
  startPerformanceTimer(operation: string): string {
    const timerId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetrics = {
      operation,
      startTime: performance.now(),
    };

    this.performanceMetrics.push(metric);
    this.debug('performance', `Started timer for: ${operation}`, { timerId });

    return timerId;
  }

  endPerformanceTimer(timerId: string, success: boolean = true, error?: string): void {
    const metric = this.performanceMetrics.find(m => m.operation.includes(timerId.split('_')[1]));
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      if (error) metric.error = error;

      this.log('performance', 'Performance metric', {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        success,
        error
      });
    }
  }

  // Log retrieval methods
  getLogs(level?: LogEntry['level'], category?: LogEntry['category'], limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMetrics.filter(m => m.endTime !== undefined);
  }

  getErrorLogs(): LogEntry[] {
    return this.logs.filter(log => log.level === 'error');
  }

  getDeviceInfo(): DeviceInfo {
    return this.deviceInfo;
  }

  // Export methods for debugging
  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      performanceMetrics: this.getPerformanceMetrics(),
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.getErrorLogs().length,
        performanceMetrics: this.getPerformanceMetrics().length,
        categories: [...new Set(this.logs.map(log => log.category))],
        levels: [...new Set(this.logs.map(log => log.level))]
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.performanceMetrics = [];
    this.info('system', 'Logs cleared');
  }

  // Analytics methods
  getLogStats(): any {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > last24Hours);

    return {
      total: this.logs.length,
      last24Hours: recentLogs.length,
      byLevel: {
        debug: this.logs.filter(l => l.level === 'debug').length,
        info: this.logs.filter(l => l.level === 'info').length,
        warn: this.logs.filter(l => l.level === 'warn').length,
        error: this.logs.filter(l => l.level === 'error').length,
      },
      byCategory: this.logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errors: this.getErrorLogs().length,
      performanceMetrics: this.getPerformanceMetrics().length
    };
  }
}

// Export singleton instance
export const mobileWalletLogger = MobileWalletLogger.getInstance();

// Export convenience functions
export const logMWA = (operation: string, data?: any) => mobileWalletLogger.logMWAOperation(operation, data);
export const logAuth = (step: string, data?: any) => mobileWalletLogger.logAuthorizationStep(step, data);
export const logConnection = (walletType: string, data?: any) => mobileWalletLogger.logConnectionAttempt(walletType, data);
export const logSigning = (operation: string, data?: any) => mobileWalletLogger.logSigningOperation(operation, data);
export const logAndroid = (method: string, data?: any) => mobileWalletLogger.logAndroidBridge(method, data);
export const logUI = (event: string, data?: any) => mobileWalletLogger.logUIEvent(event, data);

// Performance monitoring exports
export const startTimer = (operation: string) => mobileWalletLogger.startPerformanceTimer(operation);
export const endTimer = (timerId: string, success?: boolean, error?: string) => mobileWalletLogger.endPerformanceTimer(timerId, success, error);