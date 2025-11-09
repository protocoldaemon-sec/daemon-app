import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useAddressAnalysis,
  useWalletRiskScore,
  useSolanaTransactions,
  useETHBalance,
  useSearchUsername,
  useAnalyzeUsernameFootprint,
  useLookupIP,
  useAnalyzeAddress,
  useChatWithDaemon,
  useDaemonHealth,
  useStreamingAnalysis
} from '@/hooks/useDaemonRiskEngine';
import {
  Shield,
  Search,
  Globe,
  User,
  MessageCircle,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Wallet,
  Eye,
  Download,
  Loader2
} from 'lucide-react';

interface AnalysisResults {
  address: string;
  network?: string;
  riskScore?: number;
  riskLevel?: string;
  transactions?: number;
  balance?: number;
}

export default function DaemonAnalysisDashboard() {
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [analysisType, setAnalysisType] = useState<'solana' | 'ethereum'>('solana');
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // API hooks
  const { data: healthStatus, isLoading: healthLoading } = useDaemonHealth();
  const analyzeAddress = useAnalyzeAddress();
  const { data: addressAnalysis, isLoading: analysisLoading } = useAddressAnalysis(address, false);
  const { data: riskScore, isLoading: riskLoading } = useWalletRiskScore(address, false);
  const { data: solanaTransactions, isLoading: solanaLoading } = useSolanaTransactions(address, 10, false);
  const { data: ethBalance, isLoading: ethLoading } = useETHBalance(address, false);
  const searchUsername = useSearchUsername();
  const analyzeFootprint = useAnalyzeUsernameFootprint();
  const lookupIP = useLookupIP();
  const chatWithDaemon = useChatWithDaemon();
  const { analyzeWithStreaming, isStreaming } = useStreamingAnalysis();

  const handleAddressAnalysis = async () => {
    if (!address) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeAddress.mutateAsync(address);
      setResults({
        address,
        network: result.network,
        riskScore: result.analysis.risk_score,
        riskLevel: result.analysis.risk_level,
        transactions: result.analysis.transactions_analyzed,
        balance: result.analysis.balance
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUsernameSearch = async () => {
    if (!username) return;
    await searchUsername.mutateAsync({ username });
  };

  const handleFootprintAnalysis = async () => {
    if (!username) return;
    await analyzeFootprint.mutateAsync(username);
  };

  const handleIPLookup = async () => {
    await lookupIP.mutateAsync({ ip: ipAddress || undefined, includeSecurity: true });
  };

  const handleChat = async () => {
    if (!chatMessage) return;
    await chatWithDaemon.mutateAsync({
      message: chatMessage,
      system_prompt: 'You are Daemon AI, a blockchain security expert assistant.'
    });
    setChatMessage('');
  };

  const handleStreamingAnalysis = async () => {
    if (!address) return;

    analyzeWithStreaming(
      address,
      (chunk) => {
        console.log('Received chunk:', chunk);
        // You can update UI here for real-time progress
      },
      (result) => {
        console.log('Analysis complete:', result);
        setResults({
          address,
          network: result.network || 'unknown',
          riskScore: result.analysis?.risk_score,
          riskLevel: result.analysis?.risk_level,
          transactions: result.analysis?.transactions_analyzed,
          balance: result.analysis?.balance
        });
      },
      (error) => {
        console.error('Streaming error:', error);
      }
    );
  };

  const getRiskLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskLevelIcon = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daemon Risk Engine</h1>
          <p className="text-muted-foreground">Advanced blockchain analysis and security insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={healthStatus ? 'default' : 'destructive'} className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            {healthLoading ? 'Checking...' : healthStatus ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analysis">Address Analysis</TabsTrigger>
          <TabsTrigger value="osint">OSINT</TabsTrigger>
          <TabsTrigger value="ip-tracer">IP Tracer</TabsTrigger>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Address Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Address Analysis
              </CardTitle>
              <CardDescription>
                Analyze blockchain addresses for security risks, transactions, and patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="address">Wallet Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter Solana or Ethereum address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Label htmlFor="network">Network</Label>
                  <Select value={analysisType} onValueChange={(value: 'solana' | 'ethereum') => setAnalysisType(value)}>
                    <SelectTrigger id="network">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddressAnalysis}
                  disabled={!address || isAnalyzing || analysisLoading}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing || analysisLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Analyze Address
                </Button>
                <Button
                  variant="outline"
                  onClick={handleStreamingAnalysis}
                  disabled={!address || isStreaming}
                  className="flex items-center gap-2"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  Stream Analysis
                </Button>
              </div>

              {isStreaming && (
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Real-time analysis in progress... Check console for updates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Risk Score</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={results.riskScore || 0} className="flex-1" />
                      <span className="text-sm font-medium">{results.riskScore}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Risk Level</Label>
                    <Badge className={`${getRiskLevelColor(results.riskLevel)} text-white flex items-center gap-1 w-fit`}>
                      {getRiskLevelIcon(results.riskLevel)}
                      {results.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Transactions</Label>
                    <p className="text-2xl font-bold">{results.transactions || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Balance</Label>
                    <p className="text-2xl font-bold">{results.balance || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* OSINT Tab */}
        <TabsContent value="osint" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                OSINT Search
              </CardTitle>
              <CardDescription>
                Search for usernames across social media platforms and analyze digital footprints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username to search"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUsernameSearch}
                  disabled={!username || searchUsername.isPending}
                  className="flex items-center gap-2"
                >
                  {searchUsername.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search Username
                </Button>
                <Button
                  variant="outline"
                  onClick={handleFootprintAnalysis}
                  disabled={!username || analyzeFootprint.isPending}
                  className="flex items-center gap-2"
                >
                  {analyzeFootprint.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  Analyze Footprint
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IP Tracer Tab */}
        <TabsContent value="ip-tracer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                IP Tracer
              </CardTitle>
              <CardDescription>
                Lookup IP addresses for geolocation and security analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ip">IP Address (optional - will use your IP if empty)</Label>
                <Input
                  id="ip"
                  placeholder="Enter IP address or leave empty for your IP"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>
              <Button
                onClick={handleIPLookup}
                disabled={lookupIP.isPending}
                className="flex items-center gap-2"
              >
                {lookupIP.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Lookup IP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Daemon AI Chat
              </CardTitle>
              <CardDescription>
                Chat with Daemon AI for blockchain security insights and assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chat">Message</Label>
                <Textarea
                  id="chat"
                  placeholder="Ask Daemon AI about blockchain security, analysis, or any related topics..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={handleChat}
                disabled={!chatMessage || chatWithDaemon.isPending}
                className="flex items-center gap-2"
              >
                {chatWithDaemon.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Send Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {results ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Complete Analysis Results
                </CardTitle>
                <CardDescription>
                  Comprehensive security analysis for {results.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Network</p>
                          <p className="font-bold">{results.network?.toUpperCase()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-orange-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Risk Score</p>
                          <p className="font-bold">{results.riskScore}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Balance</p>
                          <p className="font-bold">{results.balance}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Transactions</p>
                          <p className="font-bold">{results.transactions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Actions</h3>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export PDF Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Analysis Results</h3>
                <p className="text-muted-foreground">
                  Perform an address analysis to see detailed results here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}