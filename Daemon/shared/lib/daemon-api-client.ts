import type {
  ChatRequest,
  ChatStreamRequest,
  AnalysisRequest,
  BatchAnalysisRequest,
  WalletRiskScore,
  AnalysisResult,
  SolanaTransaction,
  SolanaBalanceChange,
  TokenMetadata,
  NFTMetadata,
  WebhookEvent,
  ETHBalance,
  ETHTransaction,
  ERC20Transfer,
  ERC721Transfer,
  OSINTSearchResult,
  OSINTAnalysis,
  OSINTRiskAssessment,
  PresenceLevelInfo,
  OSINTSearchStats,
  IPLookup,
  PDFReportRequest,
  PDFReportResponse,
  SystemPrompt,
  ApiResponse,
  PaginatedResponse,
  HealthResponse,
  APIInfo
} from '../types/daemon-api';

export class DaemonRiskEngineAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = 'https://daemonriskengine.io', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey || '';

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Daemon-Seeker-App/1.0.0',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      console.log(`[DaemonAPI] Requesting: ${this.baseUrl}${endpoint}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      console.log(`[DaemonAPI] Response status: ${response.status} for ${url}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DaemonAPI] API Error ${response.status}: ${errorText}`);
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`[DaemonAPI] Success for ${url}`);
        return {
          success: true,
          data,
          timestamp: new Date().toISOString()
        };
      } else {
        const textData = await response.text();
        console.log(`[DaemonAPI] Success (text) for ${url}`);
        return {
          success: true,
          data: textData as T,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`[DaemonAPI] Request failed for ${this.baseUrl}${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========================================
  // General Endpoints
  // ========================================

  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/health');
  }

  async getAPIInfo(): Promise<ApiResponse<APIInfo>> {
    return this.request<APIInfo>('/info');
  }

  // ========================================
  // Chat Endpoints
  // ========================================

  async chatWithDaemon(request: ChatRequest): Promise<ApiResponse<any>> {
    return this.request('/chat-daemon', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async chatWithDaemonStream(request: ChatStreamRequest): Promise<ReadableStream> {
    const url = `${this.baseUrl}/chat-daemon-stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Stream Error ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  async getSystemPrompts(): Promise<ApiResponse<SystemPrompt[]>> {
    return this.request<SystemPrompt[]>('/chat-daemon/system-prompts');
  }

  // ========================================
  // Analysis Endpoints
  // ========================================

  async analyzeAddressStream(address: string, apiKey?: string): Promise<ReadableStream> {
    const url = `${this.baseUrl}/analyze/${address}${apiKey ? `?api_key=${apiKey}` : ''}`;
    const response = await fetch(url, { headers: this.defaultHeaders });

    if (!response.ok) {
      throw new Error(`Analysis Error ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  async analyzeAddressAlternativeStream(address: string): Promise<ReadableStream> {
    const url = `${this.baseUrl}/analyze/alt/${address}`;
    const response = await fetch(url, { headers: this.defaultHeaders });

    if (!response.ok) {
      throw new Error(`Analysis Error ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  async analyzeSync(address: string): Promise<ApiResponse<AnalysisResult>> {
    return this.request<AnalysisResult>(`/analyze/sync?address=${address}`, {
      method: 'POST'
    });
  }

  async analyzeSyncAlternative(address: string): Promise<ApiResponse<AnalysisResult>> {
    return this.request<AnalysisResult>(`/analyze/sync/alt?address=${address}`, {
      method: 'POST'
    });
  }

  async analyzeBatch(addresses: string[], limit?: number): Promise<ApiResponse<AnalysisResult[]>> {
    const url = `/analyze/batch${limit ? `?limit=${limit}` : ''}`;
    return this.request<AnalysisResult[]>(url, {
      method: 'POST',
      body: JSON.stringify(addresses)
    });
  }

  async analyzeBatchAlternative(addresses: string[], limit?: number): Promise<ApiResponse<AnalysisResult[]>> {
    const url = `/analyze/batch/alt${limit ? `?limit=${limit}` : ''}`;
    return this.request<AnalysisResult[]>(url, {
      method: 'POST',
      body: JSON.stringify(addresses)
    });
  }

  async getWalletRiskScore(address: string): Promise<ApiResponse<WalletRiskScore>> {
    return this.request<WalletRiskScore>(`/address/${address}/risk-score`);
  }

  async exportPDFReport(address: string): Promise<ApiResponse<PDFReportResponse>> {
    return this.request<PDFReportResponse>(`/export/pdf/${address}`);
  }

  // ========================================
  // Solana Endpoints
  // ========================================

  async getSolanaAddressTransactions(address: string, limit: number = 20): Promise<ApiResponse<SolanaTransaction[]>> {
    return this.request<SolanaTransaction[]>(`/sol/address/${address}/transactions?limit=${limit}`);
  }

  async getSolanaAddressTransactionsREST(address: string, limit: number = 10): Promise<ApiResponse<SolanaTransaction[]>> {
    return this.request<SolanaTransaction[]>(`/sol/address/${address}/transactions-rest?limit=${limit}`);
  }

  async getSolanaAddressSignatures(address: string, limit: number = 10): Promise<ApiResponse<string[]>> {
    return this.request<string[]>(`/sol/address/${address}/signatures?limit=${limit}`);
  }

  async getSolanaBalanceChanges(address: string): Promise<ApiResponse<SolanaBalanceChange[]>> {
    return this.request<SolanaBalanceChange[]>(`/sol/address/${address}/balance-changes`);
  }

  async resolveSolanaWalletName(address: string): Promise<ApiResponse<{ name: string }>> {
    return this.request<{ name: string }>(`/sol/address/${address}/resolve-name`);
  }

  async getSolanaWalletRiskScore(address: string): Promise<ApiResponse<WalletRiskScore>> {
    return this.request<WalletRiskScore>(`/sol/address/${address}/risk-score`);
  }

  async getSolanaRawAddressData(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/sol/address/${address}/raw-data`);
  }

  async getSolanaTransactionDetails(signature: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/sol/transaction/${signature}`);
  }

  async getSolanaTokenMetadata(mint: string): Promise<ApiResponse<TokenMetadata>> {
    return this.request<TokenMetadata>(`/sol/token/${mint}/metadata`);
  }

  async getSolanaNFTMetadata(mint: string): Promise<ApiResponse<NFTMetadata>> {
    return this.request<NFTMetadata>(`/sol/nft/${mint}/metadata`);
  }

  async getSolanaWebhookEvents(addresses: string[], limit: number = 5): Promise<ApiResponse<WebhookEvent[]>> {
    const addressesParam = Array.isArray(addresses) ? addresses.join(',') : addresses;
    return this.request<WebhookEvent[]>(`/sol/webhook/events?addresses=${addressesParam}&limit=${limit}`);
  }

  // ========================================
  // Ethereum Endpoints
  // ========================================

  async getETHBalance(address: string): Promise<ApiResponse<ETHBalance>> {
    return this.request<ETHBalance>(`/eth/balance/${address}`);
  }

  async getETHBalanceMulti(addresses: string[]): Promise<ApiResponse<ETHBalance[]>> {
    const addressesParam = Array.isArray(addresses) ? addresses.join(',') : addresses;
    return this.request<ETHBalance[]>(`/eth/balance-multi?addresses=${addressesParam}`);
  }

  async getETHTxList(address: string, page: number = 1, offset: number = 10, sort: string = 'asc'): Promise<ApiResponse<ETHTransaction[]>> {
    return this.request<ETHTransaction[]>(`/eth/txlist/${address}?page=${page}&offset=${offset}&sort=${sort}`);
  }

  async getETHInternalTxList(address: string, page: number = 1, offset: number = 10, sort: string = 'asc'): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/eth/internal-txlist/${address}?page=${page}&offset=${offset}&sort=${sort}`);
  }

  async getETHInternalTxByHash(txhash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/eth/internal-tx/${txhash}`);
  }

  async getETHERC20Transfers(address: string, contractAddress?: string, page: number = 1, offset: number = 100, sort: string = 'asc'): Promise<ApiResponse<ERC20Transfer[]>> {
    let url = `/eth/erc20/${address}?page=${page}&offset=${offset}&sort=${sort}`;
    if (contractAddress) {
      url += `&contractaddress=${contractAddress}`;
    }
    return this.request<ERC20Transfer[]>(url);
  }

  async getETHERC721Transfers(address: string, contractAddress?: string, page: number = 1, offset: number = 100, sort: string = 'asc'): Promise<ApiResponse<ERC721Transfer[]>> {
    let url = `/eth/erc721/${address}?page=${page}&offset=${offset}&sort=${sort}`;
    if (contractAddress) {
      url += `&contractaddress=${contractAddress}`;
    }
    return this.request<ERC721Transfer[]>(url);
  }

  async getETHERC1155Transfers(address: string, contractAddress?: string, page: number = 1, offset: number = 100, sort: string = 'asc'): Promise<ApiResponse<any[]>> {
    let url = `/eth/erc1155/${address}?page=${page}&offset=${offset}&sort=${sort}`;
    if (contractAddress) {
      url += `&contractaddress=${contractAddress}`;
    }
    return this.request<any[]>(url);
  }

  async getETHFundedBy(address: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/eth/fundedby/${address}`);
  }

  async getETHBlocksValidated(address: string, page: number = 1, offset: number = 10, blocktype: string = 'blocks'): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/eth/blocks-validated/${address}?page=${page}&offset=${offset}&blocktype=${blocktype}`);
  }

  async getETHBeaconWithdrawals(address: string, page: number = 1, offset: number = 100, sort: string = 'asc'): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/eth/beacon-withdrawals/${address}?page=${page}&offset=${offset}&sort=${sort}`);
  }

  async getETHBalanceHistory(address: string, blockNo: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/eth/balance-history/${address}?blockno=${blockNo}`);
  }

  async getETHTxStatus(txhash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/eth/tx-status/${txhash}`);
  }

  async getETHWalletRiskScore(address: string): Promise<ApiResponse<WalletRiskScore>> {
    return this.request<WalletRiskScore>(`/eth/address/${address}/risk-score`);
  }

  // ========================================
  // OSINT Endpoints
  // ========================================

  async getOSINTHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/daemon-osint/health');
  }

  async getSupportedPlatforms(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/daemon-osint/platforms');
  }

  async searchUsername(username: string, includeNSFW: boolean = false, verify: boolean = true): Promise<ApiResponse<OSINTSearchResult>> {
    let url = `/daemon-osint/search/${username}?verify=${verify}&include_nsfw=${includeNSFW}`;
    return this.request<OSINTSearchResult>(url);
  }

  async searchUsernameStandard(username: string): Promise<ApiResponse<OSINTSearchResult>> {
    return this.request<OSINTSearchResult>(`/daemon-osint/search/${username}/standard`);
  }

  async searchUsernameNSFW(username: string): Promise<ApiResponse<OSINTSearchResult>> {
    return this.request<OSINTSearchResult>(`/daemon-osint/search/${username}/nsfw`);
  }

  async analyzeUsernameFootprint(username: string): Promise<ApiResponse<OSINTAnalysis>> {
    return this.request<OSINTAnalysis>(`/daemon-osint/analyze/${username}`);
  }

  async batchSearchUsernames(usernames: string[]): Promise<ApiResponse<OSINTSearchResult[]>> {
    return this.request<OSINTSearchResult[]>('/daemon-osint/search/batch', {
      method: 'POST',
      body: JSON.stringify({ usernames })
    });
  }

  async batchAnalyzeUsernames(usernames: string[]): Promise<ApiResponse<OSINTAnalysis[]>> {
    return this.request<OSINTAnalysis[]>('/daemon-osint/analyze/batch', {
      method: 'POST',
      body: JSON.stringify(usernames)
    });
  }

  async getOSINTRiskAssessment(username: string): Promise<ApiResponse<OSINTRiskAssessment>> {
    return this.request<OSINTRiskAssessment>(`/daemon-osint/risk-assessment/${username}`);
  }

  async getPresenceLevelInfo(): Promise<ApiResponse<PresenceLevelInfo>> {
    return this.request<PresenceLevelInfo>('/daemon-osint/presence-levels');
  }

  async getSearchStatistics(username: string): Promise<ApiResponse<OSINTSearchStats>> {
    return this.request<OSINTSearchStats>(`/daemon-osint/search-stats/${username}`);
  }

  // ========================================
  // IP Tracer Endpoints
  // ========================================

  async getIPHealth(): Promise<ApiResponse<HealthResponse>> {
    return this.request<HealthResponse>('/daemon-ip/health');
  }

  async lookupIP(ip?: string, fields?: string, includeHostname: boolean = false, includeSecurity: boolean = false): Promise<ApiResponse<IPLookup>> {
    let url = '/daemon-ip/lookup?';
    const params = new URLSearchParams();

    if (ip) params.append('ip', ip);
    if (fields) params.append('fields', fields);
    if (includeHostname) params.append('include_hostname', 'true');
    if (includeSecurity) params.append('include_security', 'true');

    url += params.toString();
    return this.request<IPLookup>(url);
  }

  // ========================================
  // Daemon Risk Engine v1 Endpoints (New)
  // ========================================

  // Main Chat endpoints
  async chatWithDaemonV1(request: any): Promise<ApiResponse<any>> {
    return this.request('/v1/chat', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async chatWithDaemonStreamV1(request: any): Promise<ReadableStream> {
    const url = `${this.baseUrl}/v1/chat/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Stream Error ${response.status}: ${response.statusText}`);
    }

    return response.body!;
  }

  // Analysis endpoints
  async analyzeAddressV1(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/analyze/${address}`);
  }

  async analyzeAddressBatchV1(addresses: string[]): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/v1/analyze/batch', {
      method: 'POST',
      body: JSON.stringify(addresses)
    });
  }

  // Signature check
  async checkSignature(signature: string, address?: string): Promise<ApiResponse<any>> {
    let url = `/v1/check/${signature}`;
    if (address) {
      url += `?address=${address}`;
    }
    return this.request<any>(url);
  }

  // Payment check
  async checkPayment(transactionHash: string, recipient: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/check/payment?hash=${transactionHash}&recipient=${recipient}`);
  }

  // Activity check
  async checkActivity(period: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/check/activity?period=${period}`);
  }

  // ========================================
  // Additional Crypto Endpoints (New)
  // ========================================

  // Bitcoin endpoints
  async getBitcoinAddressBalance(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/bitcoin/address/${address}/balance`);
  }

  async getBitcoinAddressStats(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/bitcoin/address/${address}/stats`);
  }

  async getBitcoinTransactionDetails(txid: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/bitcoin/transaction/${txid}`);
  }

  async getBitcoinBlockStats(blockNumber?: number): Promise<ApiResponse<any>> {
    const url = blockNumber ? `/bitcoin/block/stats/${blockNumber}` : '/bitcoin/block/stats';
    return this.request<any>(url);
  }

  async getBitcoinDominance(): Promise<ApiResponse<any>> {
    return this.request<any>('/bitcoin/dominance');
  }

  async getBitcoinFearGreedIndex(): Promise<ApiResponse<any>> {
    return this.request<any>('/bitcoin/fear-greed-index');
  }

  // Dogecoin endpoints
  async getDogecoinAddressBalance(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dogecoin/address/${address}/balance`);
  }

  async getDogecoinAddressStats(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dogecoin/address/${address}/stats`);
  }

  async getDogecoinTransactionDetails(txid: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/dogecoin/transaction/${txid}`);
  }

  async getDogecoinBlockStats(blockNumber?: number): Promise<ApiResponse<any>> {
    const url = blockNumber ? `/dogecoin/block/stats/${blockNumber}` : '/dogecoin/block/stats';
    return this.request<any>(url);
  }

  async getDogecoinPrice(): Promise<ApiResponse<any>> {
    return this.request<any>('/dogecoin/price');
  }

  // Cardano endpoints
  async getCardanoAddressInfo(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/address/${address}/info`);
  }

  async getCardanoAddressAssets(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/address/${address}/assets`);
  }

  async getCardanoTransactionDetails(txHash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/transaction/${txHash}`);
  }

  async getCardanoBlockInfo(blockHash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/block/info/${blockHash}`);
  }

  async getCardanoEpochInfo(epoch: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/epoch/${epoch}`);
  }

  async getCardanoNativeAssetInfo(assetPolicy: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/asset/${assetPolicy}`);
  }

  async getCardanoPoolInfo(poolId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/cardano/pool/${poolId}`);
  }

  // Polkadot endpoints
  async getPolkadotAddressBalance(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/address/${address}/balance`);
  }

  async getPolkadotTransactionDetails(txHash: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/transaction/${txHash}`);
  }

  async getPolkadotAccountInfo(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/account/${address}/info`);
  }

  async getPolkadotStakingInfo(address: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/account/${address}/staking`);
  }

  async getPolkadotBlockInfo(blockNumber: number): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/block/${blockNumber}`);
  }

  async getPolkadotValidatorInfo(validatorId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/polkadot/validator/${validatorId}`);
  }

  async getPolkadotNetworkStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/polkadot/network/stats');
  }

  // ========================================
  // Analytics & Intelligence Endpoints (New)
  // ========================================

  async getAnalytics(token: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/analytics?token=${token}`);
  }

  async getAnalyticsToken(token: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/v1/analytics/token/${token}`);
  }

  async getAptosAddressTransactions(address: string, limit?: number): Promise<ApiResponse<any>> {
    const url = limit ? `/v1/aptos/address/${address}/transactions?limit=${limit}` : `/v1/aptos/address/${address}/transactions`;
    return this.request<any>(url);
  }

  async getAptosAccountResources(address: string, limit?: number): Promise<ApiResponse<any>> {
    const url = limit ? `/v1/aptos/account/${address}/resources?limit=${limit}` : `/v1/aptos/account/${address}/resources`;
    return this.request<any>(url);
  }

  async getAptosAccountCoins(address: string, limit?: number): Promise<ApiResponse<any>> {
    const url = limit ? `/v1/aptos/account/${address}/coins?limit=${limit}` : `/v1/aptos/account/${address}/coins`;
    return this.request<any>(url);
  }

  async getArbitrumAddressTransactions(address: string, limit?: number, page?: number): Promise<ApiResponse<any>> {
    let url = `/v1/arbitrum/address/${address}/transactions`;
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (page) params.append('page', page.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<any>(url);
  }

  // ========================================
  // Utility Methods
  // ========================================

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  getApiKey(): string {
    return this.apiKey;
  }
}

// SECURITY: API key for Daemon Risk Engine
const DAEMON_API_KEY = 'dp_NbAXrjri2afah7neUTYwTPUtI2i67YdX';

// Create a default instance with Daemon Risk Engine API key
export const daemonAPI = new DaemonRiskEngineAPI(
  'https://api.agent.daemonprotocol.com',
  DAEMON_API_KEY
);

// Export individual methods for easier importing
export const {
  getHealth,
  getAPIInfo,
  chatWithDaemon,
  chatWithDaemonStream,
  getSystemPrompts,
  analyzeAddressStream,
  analyzeAddressAlternativeStream,
  analyzeSync,
  analyzeSyncAlternative,
  analyzeBatch,
  analyzeBatchAlternative,
  getWalletRiskScore,
  exportPDFReport,
  // Solana
  getSolanaAddressTransactions,
  getSolanaAddressTransactionsREST,
  getSolanaAddressSignatures,
  getSolanaBalanceChanges,
  resolveSolanaWalletName,
  getSolanaWalletRiskScore,
  getSolanaRawAddressData,
  getSolanaTransactionDetails,
  getSolanaTokenMetadata,
  getSolanaNFTMetadata,
  getSolanaWebhookEvents,
  // Ethereum
  getETHBalance,
  getETHBalanceMulti,
  getETHTxList,
  getETHInternalTxList,
  getETHInternalTxByHash,
  getETHERC20Transfers,
  getETHERC721Transfers,
  getETHERC1155Transfers,
  getETHFundedBy,
  getETHBlocksValidated,
  getETHBeaconWithdrawals,
  getETHBalanceHistory,
  getETHTxStatus,
  getETHWalletRiskScore,
  // OSINT
  getOSINTHealth,
  getSupportedPlatforms,
  searchUsername,
  searchUsernameStandard,
  searchUsernameNSFW,
  analyzeUsernameFootprint,
  batchSearchUsernames,
  batchAnalyzeUsernames,
  getOSINTRiskAssessment,
  getPresenceLevelInfo,
  getSearchStatistics,
  // IP Tracer
  getIPHealth,
  lookupIP,
  // Daemon Risk Engine v1
  chatWithDaemonV1,
  chatWithDaemonStreamV1,
  analyzeAddressV1,
  analyzeAddressBatchV1,
  checkSignature,
  checkPayment,
  checkActivity,
  // Bitcoin
  getBitcoinAddressBalance,
  getBitcoinAddressStats,
  getBitcoinTransactionDetails,
  getBitcoinBlockStats,
  getBitcoinDominance,
  getBitcoinFearGreedIndex,
  // Dogecoin
  getDogecoinAddressBalance,
  getDogecoinAddressStats,
  getDogecoinTransactionDetails,
  getDogecoinBlockStats,
  getDogecoinPrice,
  // Cardano
  getCardanoAddressInfo,
  getCardanoAddressAssets,
  getCardanoTransactionDetails,
  getCardanoBlockInfo,
  getCardanoEpochInfo,
  getCardanoNativeAssetInfo,
  getCardanoPoolInfo,
  // Polkadot
  getPolkadotAddressBalance,
  getPolkadotTransactionDetails,
  getPolkadotAccountInfo,
  getPolkadotStakingInfo,
  getPolkadotBlockInfo,
  getPolkadotValidatorInfo,
  getPolkadotNetworkStats,
  // Analytics & Intelligence
  getAnalytics,
  getAnalyticsToken,
  getAptosAddressTransactions,
  getAptosAccountResources,
  getAptosAccountCoins,
  getArbitrumAddressTransactions
} = daemonAPI;

// Re-export types for external use
export type {
  ChatRequest,
  ChatStreamRequest,
  AnalysisRequest,
  BatchAnalysisRequest,
  WalletRiskScore,
  AnalysisResult,
  SolanaTransaction,
  SolanaBalanceChange,
  TokenMetadata,
  NFTMetadata,
  WebhookEvent,
  ETHBalance,
  ETHTransaction,
  ERC20Transfer,
  ERC721Transfer,
  OSINTSearchResult,
  OSINTAnalysis,
  OSINTRiskAssessment,
  PresenceLevelInfo,
  OSINTSearchStats,
  IPLookup,
  PDFReportRequest,
  PDFReportResponse,
  SystemPrompt,
  ApiResponse,
  PaginatedResponse,
  HealthResponse,
  APIInfo
} from '../types/daemon-api';