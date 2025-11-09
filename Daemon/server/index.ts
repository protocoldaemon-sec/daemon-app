import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createSignInData, verifySIWS } from "./routes/siws";
import {
  getHealth,
  getAPIInfo,
  chatWithDaemon,
  chatWithDaemonStream,
  getSystemPrompts,
  analyzeAddress,
  analyzeAddressAlternative,
  analyzeBatch,
  getWalletRiskScore,
  exportPDFReport,
  getSolanaTransactions,
  getSolanaBalanceChanges,
  getSolanaTokenMetadata,
  getETHBalance,
  getETHTxList,
  searchUsername,
  analyzeUsernameFootprint,
  batchSearchUsernames,
  lookupIP,
  proxyDaemonRiskEngine
} from "./routes/daemon-risk-engine";
import {
  getSystemPrompts as getAgentSystemPrompts,
  postChat,
  postChatStream,
  postAnalyze,
  getAnalyze
} from "./routes/agent";
import { proxyDaemon } from "./routes/daemon";
import {
  chatWithDaemonV1,
  chatWithDaemonStreamV1,
  analyzeAddressV1,
  analyzeAddressBatchV1,
  checkSignature,
  checkPayment,
  checkActivity,
  getBitcoinAddressBalance,
  getBitcoinAddressStats,
  getBitcoinTransactionDetails,
  getBitcoinBlockStats,
  getBitcoinDominance,
  getBitcoinFearGreedIndex,
  getDogecoinAddressBalance,
  getDogecoinPrice,
  getAnalytics,
  getAptosAddressTransactions,
  getArbitrumAddressTransactions
} from "./routes/daemon-risk-engine-v1";
import {
  authenticateApiKey,
  validateChatRequest,
  validateAddress,
  validateBatchRequest,
  rateLimit,
  corsMiddleware
} from "./middleware/auth";
import {
  mockHealthCheck,
  mockChatWithDaemon,
  mockAnalyzeAddress,
  mockBitcoinStats
} from "./routes/mock-api";

export function createServer(): Express.Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply authentication middleware to all /api routes except health checks
  app.use('/api', authenticateApiKey);

  // Apply rate limiting to prevent abuse
  app.use('/api', rateLimit(100, 60000)); // 100 requests per minute per IP

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Sign In With Solana (SIWS) endpoints
  // POST /api/siws/create - Generate sign-in input
  // POST /api/siws/verify - Verify sign-in output
  app.post("/api/siws/create", createSignInData);
  app.post("/api/siws/verify", verifySIWS);

  // Agent API proxy
  app.get(
    "/api/agent/system-prompts",
    getAgentSystemPrompts,
  );
  app.post("/api/agent/chat", postChat);
  app.post("/api/agent/chat-stream", postChatStream);
  app.post("/api/agent/analyze", postAnalyze);
  app.get("/api/agent/analyze/:address", getAnalyze);

  // Daemon Analysis API generic proxy (GET/POST)
  app.use("/api/daemon", proxyDaemon);

  // ========================================
  // Daemon Risk Engine API Endpoints
  // ========================================

  // Health and Info
  app.get("/api/daemon-risk-engine/health", getHealth);
  app.get("/api/daemon-risk-engine/info", getAPIInfo);

  // Chat endpoints
  app.post("/api/daemon-risk-engine/chat-daemon", chatWithDaemon);
  app.post("/api/daemon-risk-engine/chat-daemon-stream", chatWithDaemonStream);
  app.get("/api/daemon-risk-engine/chat-daemon/system-prompts", getSystemPrompts);

  // Analysis endpoints
  app.get("/api/daemon-risk-engine/analyze/:address", analyzeAddress);
  app.get("/api/daemon-risk-engine/analyze/alt/:address", analyzeAddressAlternative);
  app.post("/api/daemon-risk-engine/analyze/sync", (req, res) => analyzeAddress({ ...req, params: { address: req.query.address } }, res));
  app.post("/api/daemon-risk-engine/analyze/sync/alt", (req, res) => analyzeAddressAlternative({ ...req, params: { address: req.query.address } }, res));
  app.post("/api/daemon-risk-engine/analyze/batch", analyzeBatch);
  app.get("/api/daemon-risk-engine/address/:address/risk-score", getWalletRiskScore);
  app.get("/api/daemon-risk-engine/export/pdf/:address", exportPDFReport);

  // Solana endpoints
  app.get("/api/daemon-risk-engine/sol/address/:address/transactions", getSolanaTransactions);
  app.get("/api/daemon-risk-engine/sol/address/:address/balance-changes", getSolanaBalanceChanges);
  app.get("/api/daemon-risk-engine/sol/token/:mint/metadata", getSolanaTokenMetadata);

  // Ethereum endpoints
  app.get("/api/daemon-risk-engine/eth/balance/:address", getETHBalance);
  app.get("/api/daemon-risk-engine/eth/txlist/:address", getETHTxList);

  // OSINT endpoints
  app.get("/api/daemon-risk-engine/daemon-osint/search/:username", searchUsername);
  app.get("/api/daemon-risk-engine/daemon-osint/analyze/:username", analyzeUsernameFootprint);
  app.post("/api/daemon-risk-engine/daemon-osint/search/batch", batchSearchUsernames);

  // IP Tracer endpoints
  app.get("/api/daemon-risk-engine/daemon-ip/lookup", lookupIP);

  // Generic proxy for all other Daemon Risk Engine endpoints
  app.use("/api/daemon-risk-engine", proxyDaemonRiskEngine);

  // ========================================
  // Daemon Risk Engine v1 API Endpoints
  // ========================================

  // Chat endpoints with validation
  app.post("/api/v1/chat", validateChatRequest, chatWithDaemonV1);
  app.post("/api/v1/chat/stream", validateChatRequest, chatWithDaemonStreamV1);

  // Analysis endpoints with validation
  app.get("/api/v1/analyze/:address", validateAddress, analyzeAddressV1);
  app.post("/api/v1/analyze/batch", validateBatchRequest, analyzeAddressBatchV1);

  // Check endpoints
  app.get("/api/v1/check/:signature", checkSignature);
  app.get("/api/v1/check/payment", checkPayment);
  app.get("/api/v1/check/activity", checkActivity);

  // Bitcoin endpoints
  app.get("/api/bitcoin/address/:address/balance", getBitcoinAddressBalance);
  app.get("/api/bitcoin/address/:address/stats", getBitcoinAddressStats);
  app.get("/api/bitcoin/transaction/:txid", getBitcoinTransactionDetails);
  app.get("/api/bitcoin/block/stats", getBitcoinBlockStats);
  app.get("/api/bitcoin/block/stats/:blockNumber", getBitcoinBlockStats);
  app.get("/api/bitcoin/dominance", getBitcoinDominance);
  app.get("/api/bitcoin/fear-greed-index", getBitcoinFearGreedIndex);

  // Dogecoin endpoints
  app.get("/api/dogecoin/address/:address/balance", getDogecoinAddressBalance);
  app.get("/api/dogecoin/price", getDogecoinPrice);

  // Analytics endpoints
  app.get("/api/v1/analytics", getAnalytics);
  app.get("/api/v1/aptos/address/:address/transactions", getAptosAddressTransactions);
  app.get("/api/v1/arbitrum/address/:address/transactions", getArbitrumAddressTransactions);

  // ========================================
  // Mock API Endpoints (for testing integration)
  // ========================================

  app.get("/api/mock/health", mockHealthCheck);
  app.post("/api/mock/chat", validateChatRequest, mockChatWithDaemon);
  app.get("/api/mock/analyze/:address", validateAddress, mockAnalyzeAddress);
  app.get("/api/mock/bitcoin/stats", mockBitcoinStats);

  return app;
}
