/**
 * Mobile Wallet Adapter Monitoring Dashboard
 * Real-time monitoring and debugging interface for mobile wallet operations
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Download,
  RefreshCw,
  Filter,
  Search,
  Bug,
  Cpu,
  HardDrive,
  MemoryStick,
  Globe,
  Shield,
  TrendingUp,
  TrendingDown,
  Info,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useEnhancedMobileWallet } from '@/hooks/useEnhancedMobileWallet';
import { useMobileWalletAvailability } from '@/hooks/useEnhancedMobileWallet';
import { mobileWalletLogger, type LogEntry, type PerformanceMetrics } from '@/utils/mobileWalletLogger';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MonitorDashboard() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const enhancedMobile = useEnhancedMobileWallet();
  const { isSupported: isMobileSupported } = useMobileWalletAvailability();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showRawData, setShowRawData] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Auto-refresh logs
  useEffect(() => {
    const refreshData = () => {
      setLogs(mobileWalletLogger.getLogs());
      setPerformanceMetrics(mobileWalletLogger.getPerformanceMetrics());
      setNetworkStatus(navigator.onLine);
    };

    refreshData(); // Initial load

    if (autoRefresh) {
      intervalRef.current = setInterval(refreshData, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesLevel = selectedLogLevel === 'all' || log.level === selectedLogLevel;
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesLevel && matchesCategory && matchesSearch;
  });

  // Calculate statistics
  const stats = mobileWalletLogger.getLogStats();
  const deviceInfo = mobileWalletLogger.getDeviceInfo();
  const recentErrors = logs.filter(log => log.level === 'error').slice(0, 5);
  const avgResponseTime = performanceMetrics.length > 0
    ? performanceMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / performanceMetrics.length
    : 0;

  const clearLogs = () => {
    mobileWalletLogger.clearLogs();
    setLogs([]);
    setPerformanceMetrics([]);
    toast({
      title: "Logs Cleared",
      description: "All logs have been cleared successfully.",
    });
  };

  const exportLogs = () => {
    const logData = mobileWalletLogger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daemon-mwa-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs Exported",
      description: "Logs have been exported successfully.",
    });
  };

  const runQuickTest = async () => {
    const timerId = mobileWalletLogger.startPerformanceTimer('quick_test');

    try {
      mobileWalletLogger.info('monitor', 'Starting quick MWA test');

      // Test availability
      if (enhancedMobile.isAvailable) {
        mobileWalletLogger.info('monitor', 'MWA adapter is available');
      } else {
        mobileWalletLogger.warn('monitor', 'MWA adapter not available');
      }

      // Test authorization state
      if (enhancedMobile.isAuthorized) {
        mobileWalletLogger.info('monitor', 'Wallet is authorized');
      } else {
        mobileWalletLogger.info('monitor', 'Wallet not authorized');
      }

      // Test capabilities
      const capabilities = await enhancedMobile.refreshCapabilities();
      mobileWalletLogger.info('monitor', 'Capabilities refreshed', { capabilities });

      mobileWalletLogger.endTimer(timerId, true);

      toast({
        title: "Quick Test Complete",
        description: "MWA quick test completed successfully.",
      });
    } catch (error: any) {
      mobileWalletLogger.error('monitor', 'Quick test failed', error);
      mobileWalletLogger.endTimer(timerId, false, error.message);

      toast({
        title: "Quick Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'debug': return <Bug className="w-4 h-4 text-gray-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'mwa': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'authorization': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'connection': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'signing': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      'android': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      'ui': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
      'performance': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
      'network': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Mobile Wallet Monitor</h1>
                <p className="text-muted-foreground">Real-time debugging and monitoring dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")} />
                Auto Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={runQuickTest}>
                <Zap className="w-4 h-4 mr-2" />
                Quick Test
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Settings className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={cn(
              "border-2",
              enhancedMobile.isAvailable
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-red-500/30 bg-red-50/30 dark:bg-red-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">MWA Status</p>
                    <p className="text-2xl font-bold">
                      {enhancedMobile.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    enhancedMobile.isAvailable ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    {enhancedMobile.isAvailable ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              networkStatus
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-red-500/30 bg-red-50/30 dark:bg-red-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Network</p>
                    <p className="text-2xl font-bold">
                      {networkStatus ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    networkStatus ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    {networkStatus ? (
                      <Wifi className="w-5 h-5 text-green-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Total Logs</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-2",
              stats.errors === 0
                ? "border-green-500/30 bg-green-50/30 dark:bg-green-950/30"
                : "border-red-500/30 bg-red-50/30 dark:bg-red-950/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Errors</p>
                    <p className="text-2xl font-bold">{stats.errors}</p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    stats.errors === 0 ? "bg-green-500/20" : "bg-red-500/20"
                  )}>
                    <AlertTriangle className={cn("w-5 h-5", stats.errors === 0 ? "text-green-600" : "text-red-600")} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Device</p>
                  <p className="text-sm">{deviceInfo.platform}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Is Mobile</p>
                  <Badge variant={deviceInfo.isMobile ? "default" : "secondary"}>
                    {deviceInfo.isMobile ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Is Android</p>
                  <Badge variant={deviceInfo.isAndroid ? "default" : "secondary"}>
                    {deviceInfo.isAndroid ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Solana Seeker</p>
                  <Badge variant={deviceInfo.isSolanaSeeker ? "default" : "secondary"}>
                    {deviceInfo.isSolanaSeeker ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                  <p className="text-xs font-mono truncate">{deviceInfo.userAgent}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">App Version</p>
                  <p className="text-sm">{deviceInfo.appVersion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          {recentErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recent Errors:</strong> {recentErrors.length} error(s) detected.
                Check the logs below for details.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <Tabs defaultValue="logs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="logs">Live Logs</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <select
                      value={selectedLogLevel}
                      onChange={(e) => setSelectedLogLevel(e.target.value)}
                      className="px-3 py-1 rounded border text-sm"
                    >
                      <option value="all">All Levels</option>
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>

                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-1 rounded border text-sm"
                    >
                      <option value="all">All Categories</option>
                      <option value="mwa">MWA</option>
                      <option value="authorization">Authorization</option>
                      <option value="connection">Connection</option>
                      <option value="signing">Signing</option>
                      <option value="android">Android</option>
                      <option value="ui">UI</option>
                      <option value="performance">Performance</option>
                    </select>

                    <div className="relative flex-1 min-w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded border text-sm"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRawData(!showRawData)}
                    >
                      {showRawData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showRawData ? 'Hide' : 'Show'} Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Logs List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Live Logs ({filteredLogs.length})</span>
                    <Badge variant="outline">
                      {autoRefresh ? 'Live' : 'Paused'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No logs match the current filters
                      </div>
                    ) : (
                      filteredLogs.slice(-50).reverse().map((log, index) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border",
                            log.level === 'error'
                              ? "bg-red-50/50 border-red-200/50 dark:bg-red-950/50 dark:border-red-800/50"
                              : log.level === 'warn'
                              ? "bg-yellow-50/50 border-yellow-200/50 dark:bg-yellow-950/50 dark:border-yellow-800/50"
                              : "bg-slate-50/50 border-slate-200/50 dark:bg-slate-950/50 dark:border-slate-800/50"
                          )}
                        >
                          {getLogLevelIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getCategoryColor(log.category)}>
                                {log.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{log.message}</p>
                            {showRawData && log.data && (
                              <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Performance Metrics
                    </span>
                    <Badge variant="outline">
                      Avg: {avgResponseTime.toFixed(0)}ms
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceMetrics.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No performance metrics available yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {performanceMetrics.slice(-10).reverse().map((metric, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{metric.operation}</p>
                            <p className="text-sm text-muted-foreground">
                              {metric.startTime.toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              {metric.success ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <span className={cn(
                                "font-mono text-sm",
                                metric.success ? "text-green-600" : "text-red-600"
                              )}>
                                {metric.duration?.toFixed(0)}ms
                              </span>
                            </div>
                            {metric.error && (
                              <p className="text-xs text-red-600">{metric.error}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Logs by Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.byLevel).map(([level, count]) => (
                        <div key={level} className="flex items-center justify-between">
                          <span className="capitalize">{level}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Logs by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="capitalize">{category}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}