// Daemon Risk Engine API Types
// Based on OpenAPI spec v3.7.0

// ========================================
// Common Types
// ========================================

export interface APIError {
  detail?: ValidationError[];
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
}

export interface APIInfo {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
}

// ========================================
// Chat Types
// ========================================

export interface ChatRequest {
  message: string;
  system_prompt?: string;
  conversation_history?: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChatStreamRequest {
  message: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  template: string;
}

// ========================================
// Analysis Types
// ========================================

export interface AnalysisRequest {
  address: string;
  api_key?: string;
  limit?: number;
}

export interface BatchAnalysisRequest {
  addresses: string[];
  limit?: number;
}

export interface WalletRiskScore {
  address: string;
  risk_score: number; // percentage
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  timestamp: string;
}

export interface AnalysisResult {
  address: string;
  network: 'solana' | 'ethereum';
  analysis: {
    risk_score: number;
    risk_level: string;
    balance: number;
    transactions_analyzed: number;
    suspicious_activities: string[];
    tags: string[];
  };
  metadata: {
    timestamp: string;
    analysis_duration: number;
    data_source: string;
  };
}

// ========================================
// Solana Types
// ========================================

export interface SolanaTransaction {
  signature: string;
  block_time: number;
  slot: number;
  type: string;
  source: string;
  fee: number;
  status: string;
  meta: {
    pre_balances: number[];
    post_balances: number[];
    account_keys: string[];
  };
}

export interface SolanaBalanceChange {
  signature: string;
  block_time: number;
  slot: number;
  change_type: 'credit' | 'debit';
  amount: number;
  account: string;
  mint?: string;
}

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri?: string;
  description?: string;
  supply: number;
}

export interface NFTMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  collection?: {
    name: string;
    family?: string;
  };
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface WebhookEvent {
  address: string;
  signature: string;
  type: string;
  timestamp: number;
  details: Record<string, any>;
}

// ========================================
// Ethereum Types
// ========================================

export interface ETHBalance {
  address: string;
  balance: string; // wei
  eth_balance: number; // ETH
}

export interface ETHTransaction {
  hash: string;
  block_number: string;
  time_stamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gas_price: string;
  gas_used: string;
  is_error: string;
  txreceipt_status: string;
  contract_address?: string;
}

export interface ERC20Transfer {
  hash: string;
  block_number: string;
  time_stamp: string;
  from: string;
  to: string;
  value: string;
  token_name: string;
  token_symbol: string;
  token_decimal: string;
  contract_address: string;
}

export interface ERC721Transfer {
  hash: string;
  block_number: string;
  time_stamp: string;
  from: string;
  to: string;
  token_id: string;
  token_name: string;
  token_symbol: string;
  contract_address: string;
}

// ========================================
// OSINT Types
// ========================================

export interface OSINTPlatform {
  name: string;
  url?: string;
  verified?: boolean;
  profile?: {
    username: string;
    display_name?: string;
    bio?: string;
    followers?: number;
    following?: number;
    posts?: number;
    profile_image?: string;
  };
}

export interface OSINTSearchResult {
  username: string;
  platforms: OSINTPlatform[];
  total_found: number;
  verified_count: number;
  search_time: number;
  timestamp: string;
}

export interface OSINTAnalysis {
  username: string;
  presence_level: 'minimal' | 'low' | 'moderate' | 'high' | 'extensive';
  platforms: OSINTPlatform[];
  risk_factors: string[];
  reputation_score: number;
  digital_footprint_summary: {
    total_profiles: number;
    verified_profiles: number;
    risk_level: 'low' | 'medium' | 'high';
  };
  analysis_metadata: {
    search_duration: number;
    platforms_searched: number;
    timestamp: string;
  };
}

export interface OSINTRiskAssessment {
  username: string;
  overall_risk_score: number;
  risk_category: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
}

export interface PresenceLevelInfo {
  levels: Array<{
    name: string;
    description: string;
    min_profiles: number;
    risk_impact: string;
  }>;
}

export interface OSINTSearchStats {
  username: string;
  total_searches: number;
  platforms_found: number;
  success_rate: number;
  average_response_time: number;
  last_searched: string;
}

// ========================================
// IP Tracer Types
// ========================================

export interface IPLookup {
  ip: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  hostname?: string;
  security?: {
    is_tor: boolean;
    is_proxy: boolean;
    is_vpn: boolean;
  };
  threat_level?: 'low' | 'medium' | 'high';
}

// ========================================
// Export/Report Types
// ========================================

export interface PDFReportRequest {
  address: string;
  format?: 'summary' | 'detailed';
  sections?: string[];
}

export interface PDFReportResponse {
  download_url: string;
  file_id: string;
  expires_at: string;
  size_bytes: number;
}

// ========================================
// Utility Types
// ========================================

export type NetworkType = 'solana' | 'ethereum';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PresenceLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'extensive';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}