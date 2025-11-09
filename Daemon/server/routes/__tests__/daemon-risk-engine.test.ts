import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { createServer } from "../../index";

// Mock the daemonAPI client
vi.mock("../../../shared/lib/daemon-api-client", () => ({
  daemonAPI: {
    // Health and Info
    getHealth: vi.fn(),
    getAPIInfo: vi.fn(),

    // Chat
    chatWithDaemon: vi.fn(),
    chatWithDaemonStream: vi.fn(),
    getSystemPrompts: vi.fn(),

    // Analysis
    analyzeSync: vi.fn(),
    analyzeSyncAlternative: vi.fn(),
    analyzeAddressStream: vi.fn(),
    analyzeAddressAlternativeStream: vi.fn(),
    analyzeBatch: vi.fn(),
    getWalletRiskScore: vi.fn(),
    exportPDFReport: vi.fn(),

    // Solana
    getSolanaAddressTransactions: vi.fn(),
    getSolanaBalanceChanges: vi.fn(),
    getSolanaTokenMetadata: vi.fn(),

    // Ethereum
    getETHBalance: vi.fn(),
    getETHTxList: vi.fn(),

    // OSINT
    searchUsername: vi.fn(),
    analyzeUsernameFootprint: vi.fn(),
    batchSearchUsernames: vi.fn(),

    // IP Tracer
    lookupIP: vi.fn()
  }
}));

import { daemonAPI } from "../../../shared/lib/daemon-api-client";

describe("Daemon Risk Engine API Routes", () => {
  let app: Express.Application;

  beforeEach(() => {
    app = createServer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Health and Info Endpoints", () => {
    describe("GET /api/daemon-risk-engine/health", () => {
      it("should return health status successfully", async () => {
        const mockHealthResponse = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        };

        (daemonAPI.getHealth as any).mockResolvedValueOnce({
          success: true,
          data: mockHealthResponse
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/health")
          .expect(200);

        expect(response.body).toEqual(mockHealthResponse);
        expect(daemonAPI.getHealth).toHaveBeenCalledTimes(1);
      });

      it("should handle health check failures", async () => {
        (daemonAPI.getHealth as any).mockResolvedValueOnce({
          success: false,
          error: "Health check failed"
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/health")
          .expect(500);

        expect(response.body).toEqual({ error: "Health check failed" });
      });

      it("should handle API exceptions", async () => {
        (daemonAPI.getHealth as any).mockRejectedValueOnce(new Error("Network error"));

        const response = await request(app)
          .get("/api/daemon-risk-engine/health")
          .expect(500);

        expect(response.body).toEqual({ error: "Network error" });
      });
    });

    describe("GET /api/daemon-risk-engine/info", () => {
      it("should return API information", async () => {
        const mockInfoResponse = {
          name: "Daemon Risk Engine API",
          version: "2.1.0",
          endpoints: 50,
          description: "Comprehensive blockchain security analysis API"
        };

        (daemonAPI.getAPIInfo as any).mockResolvedValueOnce({
          success: true,
          data: mockInfoResponse
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/info")
          .expect(200);

        expect(response.body).toEqual(mockInfoResponse);
        expect(daemonAPI.getAPIInfo).toHaveBeenCalledTimes(1);
      });

      it("should handle API info failures", async () => {
        (daemonAPI.getAPIInfo as any).mockResolvedValueOnce({
          success: false,
          error: "API info unavailable"
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/info")
          .expect(500);

        expect(response.body).toEqual({ error: "API info unavailable" });
      });
    });
  });

  describe("Chat Endpoints", () => {
    describe("POST /api/daemon-risk-engine/chat-daemon", () => {
      it("should handle chat requests successfully", async () => {
        const mockChatRequest = {
          message: "Explain wallet security",
          context: "user help"
        };

        const mockChatResponse = {
          reply: "Here's an explanation of wallet security...",
          confidence: 0.95,
          sources: ["security-doc-1", "security-doc-2"]
        };

        (daemonAPI.chatWithDaemon as any).mockResolvedValueOnce({
          success: true,
          data: mockChatResponse
        });

        const response = await request(app)
          .post("/api/daemon-risk-engine/chat-daemon")
          .send(mockChatRequest)
          .expect(200);

        expect(response.body).toEqual(mockChatResponse);
        expect(daemonAPI.chatWithDaemon).toHaveBeenCalledWith(mockChatRequest);
      });

      it("should handle empty chat requests", async () => {
        const mockResponse = { reply: "How can I help you?" };

        (daemonAPI.chatWithDaemon as any).mockResolvedValueOnce({
          success: true,
          data: mockResponse
        });

        await request(app)
          .post("/api/daemon-risk-engine/chat-daemon")
          .send({})
          .expect(200);

        expect(daemonAPI.chatWithDaemon).toHaveBeenCalledWith({});
      });
    });

    describe("GET /api/daemon-risk-engine/chat-daemon/system-prompts", () => {
      it("should return system prompts", async () => {
        const mockPrompts = [
          { id: "security", name: "Security Analysis", prompt: "Analyze security..." },
          { id: "risk", name: "Risk Assessment", prompt: "Assess risk..." }
        ];

        (daemonAPI.getSystemPrompts as any).mockResolvedValueOnce({
          success: true,
          data: mockPrompts
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/chat-daemon/system-prompts")
          .expect(200);

        expect(response.body).toEqual(mockPrompts);
        expect(daemonAPI.getSystemPrompts).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Analysis Endpoints", () => {
    describe("GET /api/daemon-risk-engine/analyze/:address", () => {
      const testAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

      it("should analyze address synchronously", async () => {
        const mockAnalysisResult = {
          address: testAddress,
          riskScore: 0.3,
          riskLevel: "Low",
          transactions: 1500,
          firstSeen: "2023-01-01T00:00:00Z"
        };

        (daemonAPI.analyzeSync as any).mockResolvedValueOnce({
          success: true,
          data: mockAnalysisResult
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/analyze/${testAddress}`)
          .expect(200);

        expect(response.body).toEqual(mockAnalysisResult);
        expect(daemonAPI.analyzeSync).toHaveBeenCalledWith(testAddress);
      });

      it("should reject requests without address", async () => {
        const response = await request(app)
          .get("/api/daemon-risk-engine/analyze/")
          .expect(404); // Express 404 for missing route parameter
      });

      it("should handle API failures", async () => {
        (daemonAPI.analyzeSync as any).mockResolvedValueOnce({
          success: false,
          error: "Analysis failed"
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/analyze/${testAddress}`)
          .expect(500);

        expect(response.body).toEqual({ error: "Analysis failed" });
      });
    });

    describe("POST /api/daemon-risk-engine/analyze/sync", () => {
      it("should handle sync analysis via POST", async () => {
        const testAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const mockResult = { address: testAddress, riskScore: 0.7 };

        (daemonAPI.analyzeSync as any).mockResolvedValueOnce({
          success: true,
          data: mockResult
        });

        await request(app)
          .post("/api/daemon-risk-engine/analyze/sync")
          .query({ address: testAddress })
          .expect(200);

        // The handler transforms POST to GET internally
        expect(daemonAPI.analyzeSync).toHaveBeenCalledWith(testAddress);
      });
    });

    describe("GET /api/daemon-risk-engine/analyze/alt/:address", () => {
      it("should analyze with alternative method", async () => {
        const testAddress = "11111111111111111111111111111112";
        const mockResult = {
          address: testAddress,
          analysis: "Alternative analysis result",
          confidence: 0.85
        };

        (daemonAPI.analyzeSyncAlternative as any).mockResolvedValueOnce({
          success: true,
          data: mockResult
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/analyze/alt/${testAddress}`)
          .expect(200);

        expect(response.body).toEqual(mockResult);
        expect(daemonAPI.analyzeSyncAlternative).toHaveBeenCalledWith(testAddress);
      });
    });

    describe("POST /api/daemon-risk-engine/analyze/batch", () => {
      it("should analyze multiple addresses", async () => {
        const addresses = [
          "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        ];

        const mockBatchResult = {
          results: [
            { address: addresses[0], riskScore: 0.3 },
            { address: addresses[1], riskScore: 0.5 }
          ],
          processed: 2,
          failed: 0
        };

        (daemonAPI.analyzeBatch as any).mockResolvedValueOnce({
          success: true,
          data: mockBatchResult
        });

        const response = await request(app)
          .post("/api/daemon-risk-engine/analyze/batch")
          .send({ addresses })
          .expect(200);

        expect(response.body).toEqual(mockBatchResult);
        expect(daemonAPI.analyzeBatch).toHaveBeenCalledWith(addresses, undefined);
      });

      it("should accept limit parameter", async () => {
        const addresses = ["addr1", "addr2", "addr3"];

        (daemonAPI.analyzeBatch as any).mockResolvedValueOnce({
          success: true,
          data: { results: [] }
        });

        await request(app)
          .post("/api/daemon-risk-engine/analyze/batch")
          .send({ addresses })
          .query({ limit: "2" })
          .expect(200);

        expect(daemonAPI.analyzeBatch).toHaveBeenCalledWith(addresses, 2);
      });

      it("should reject empty addresses array", async () => {
        const response = await request(app)
          .post("/api/daemon-risk-engine/analyze/batch")
          .send({ addresses: [] })
          .expect(400);

        expect(response.body).toEqual({ error: "Addresses array is required" });
      });

      it("should reject missing addresses", async () => {
        const response = await request(app)
          .post("/api/daemon-risk-engine/analyze/batch")
          .send({})
          .expect(400);

        expect(response.body).toEqual({ error: "Addresses array is required" });
      });
    });

    describe("GET /api/daemon-risk-engine/address/:address/risk-score", () => {
      it("should return wallet risk score", async () => {
        const testAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        const mockRiskScore = {
          address: testAddress,
          score: 0.25,
          level: "Low Risk",
          factors: ["low transaction volume", "clean history"]
        };

        (daemonAPI.getWalletRiskScore as any).mockResolvedValueOnce({
          success: true,
          data: mockRiskScore
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/address/${testAddress}/risk-score`)
          .expect(200);

        expect(response.body).toEqual(mockRiskScore);
        expect(daemonAPI.getWalletRiskScore).toHaveBeenCalledWith(testAddress);
      });
    });

    describe("GET /api/daemon-risk-engine/export/pdf/:address", () => {
      it("should export PDF report", async () => {
        const testAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const mockPDFResult = {
          url: "https://storage.example.com/reports/address-analysis.pdf",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        (daemonAPI.exportPDFReport as any).mockResolvedValueOnce({
          success: true,
          data: mockPDFResult
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/export/pdf/${testAddress}`)
          .expect(200);

        expect(response.body).toEqual(mockPDFResult);
        expect(daemonAPI.exportPDFReport).toHaveBeenCalledWith(testAddress);
      });
    });
  });

  describe("Solana Endpoints", () => {
    describe("GET /api/daemon-risk-engine/sol/address/:address/transactions", () => {
      it("should get Solana transactions", async () => {
        const testAddress = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        const mockTransactions = {
          transactions: [
            { signature: "sig1", slot: 1000, blockTime: 1640995200 },
            { signature: "sig2", slot: 1001, blockTime: 1640995300 }
          ],
          total: 2,
          limit: 20
        };

        (daemonAPI.getSolanaAddressTransactions as any).mockResolvedValueOnce({
          success: true,
          data: mockTransactions
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/sol/address/${testAddress}/transactions`)
          .expect(200);

        expect(response.body).toEqual(mockTransactions);
        expect(daemonAPI.getSolanaAddressTransactions).toHaveBeenCalledWith(testAddress, 20);
      });

      it("should use custom limit parameter", async () => {
        const testAddress = "test";
        const limit = 50;

        (daemonAPI.getSolanaAddressTransactions as any).mockResolvedValueOnce({
          success: true,
          data: { transactions: [], total: 0, limit }
        });

        await request(app)
          .get(`/api/daemon-risk-engine/sol/address/${testAddress}/transactions`)
          .query({ limit: limit.toString() })
          .expect(200);

        expect(daemonAPI.getSolanaAddressTransactions).toHaveBeenCalledWith(testAddress, limit);
      });
    });

    describe("GET /api/daemon-risk-engine/sol/address/:address/balance-changes", () => {
      it("should get balance changes", async () => {
        const testAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const mockBalanceChanges = {
          changes: [
            { slot: 1000, preBalance: 1000000, postBalance: 950000 },
            { slot: 1001, preBalance: 950000, postBalance: 900000 }
          ],
          netChange: -100000
        };

        (daemonAPI.getSolanaBalanceChanges as any).mockResolvedValueOnce({
          success: true,
          data: mockBalanceChanges
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/sol/address/${testAddress}/balance-changes`)
          .expect(200);

        expect(response.body).toEqual(mockBalanceChanges);
        expect(daemonAPI.getSolanaBalanceChanges).toHaveBeenCalledWith(testAddress);
      });
    });

    describe("GET /api/daemon-risk-engine/sol/token/:mint/metadata", () => {
      it("should get token metadata", async () => {
        const testMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        const mockMetadata = {
          mint: testMint,
          name: "USDC",
          symbol: "USDC",
          decimals: 6,
          supply: "1000000000000"
        };

        (daemonAPI.getSolanaTokenMetadata as any).mockResolvedValueOnce({
          success: true,
          data: mockMetadata
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/sol/token/${testMint}/metadata`)
          .expect(200);

        expect(response.body).toEqual(mockMetadata);
        expect(daemonAPI.getSolanaTokenMetadata).toHaveBeenCalledWith(testMint);
      });
    });
  });

  describe("Ethereum Endpoints", () => {
    describe("GET /api/daemon-risk-engine/eth/balance/:address", () => {
      it("should get ETH balance", async () => {
        const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45";
        const mockBalance = {
          address: testAddress,
          balance: "1.5",
          balanceWei: "1500000000000000000",
          usdValue: "3000.00"
        };

        (daemonAPI.getETHBalance as any).mockResolvedValueOnce({
          success: true,
          data: mockBalance
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/eth/balance/${testAddress}`)
          .expect(200);

        expect(response.body).toEqual(mockBalance);
        expect(daemonAPI.getETHBalance).toHaveBeenCalledWith(testAddress);
      });
    });

    describe("GET /api/daemon-risk-engine/eth/txlist/:address", () => {
      it("should get ETH transaction list", async () => {
        const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45";
        const mockTxList = {
          transactions: [
            { hash: "0x123...", blockNumber: 15000000, timestamp: 1640995200 },
            { hash: "0x456...", blockNumber: 15000001, timestamp: 1640995300 }
          ],
          page: 1,
          offset: 10,
          total: 25
        };

        (daemonAPI.getETHTxList as any).mockResolvedValueOnce({
          success: true,
          data: mockTxList
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/eth/txlist/${testAddress}`)
          .expect(200);

        expect(response.body).toEqual(mockTxList);
        expect(daemonAPI.getETHTxList).toHaveBeenCalledWith(testAddress, 1, 10, "asc");
      });

      it("should use custom query parameters", async () => {
        const testAddress = "test";
        const page = 2;
        const offset = 20;
        const sort = "desc";

        (daemonAPI.getETHTxList as any).mockResolvedValueOnce({
          success: true,
          data: { transactions: [], page, offset, total: 0 }
        });

        await request(app)
          .get(`/api/daemon-risk-engine/eth/txlist/${testAddress}`)
          .query({ page: page.toString(), offset: offset.toString(), sort })
          .expect(200);

        expect(daemonAPI.getETHTxList).toHaveBeenCalledWith(testAddress, page, offset, sort);
      });
    });
  });

  describe("OSINT Endpoints", () => {
    describe("GET /api/daemon-risk-engine/daemon-osint/search/:username", () => {
      it("should search username", async () => {
        const username = "testuser";
        const mockSearchResult = {
          username,
          platforms: [
            { platform: "twitter", found: true, url: "https://twitter.com/testuser" },
            { platform: "github", found: false }
          ],
          totalPlatforms: 10,
          foundPlatforms: 3
        };

        (daemonAPI.searchUsername as any).mockResolvedValueOnce({
          success: true,
          data: mockSearchResult
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/daemon-osint/search/${username}`)
          .expect(200);

        expect(response.body).toEqual(mockSearchResult);
        expect(daemonAPI.searchUsername).toHaveBeenCalledWith(username, false, true);
      });

      it("should handle NSFW and verify parameters", async () => {
        const username = "user123";

        (daemonAPI.searchUsername as any).mockResolvedValueOnce({
          success: true,
          data: { username }
        });

        await request(app)
          .get(`/api/daemon-risk-engine/daemon-osint/search/${username}`)
          .query({ include_nsfw: "true", verify: "false" })
          .expect(200);

        expect(daemonAPI.searchUsername).toHaveBeenCalledWith(username, true, false);
      });
    });

    describe("GET /api/daemon-risk-engine/daemon-osint/analyze/:username", () => {
      it("should analyze username footprint", async () => {
        const username = "targetuser";
        const mockFootprint = {
          username,
          riskScore: 0.4,
          patterns: ["common naming convention", "platform consistency"],
          associations: ["related1", "related2"]
        };

        (daemonAPI.analyzeUsernameFootprint as any).mockResolvedValueOnce({
          success: true,
          data: mockFootprint
        });

        const response = await request(app)
          .get(`/api/daemon-risk-engine/daemon-osint/analyze/${username}`)
          .expect(200);

        expect(response.body).toEqual(mockFootprint);
        expect(daemonAPI.analyzeUsernameFootprint).toHaveBeenCalledWith(username);
      });
    });

    describe("POST /api/daemon-risk-engine/daemon-osint/search/batch", () => {
      it("should batch search usernames", async () => {
        const usernames = ["user1", "user2", "user3"];
        const mockBatchResult = {
          results: [
            { username: "user1", platforms: ["twitter"] },
            { username: "user2", platforms: ["github"] },
            { username: "user3", platforms: [] }
          ],
          processed: 3
        };

        (daemonAPI.batchSearchUsernames as any).mockResolvedValueOnce({
          success: true,
          data: mockBatchResult
        });

        const response = await request(app)
          .post("/api/daemon-risk-engine/daemon-osint/search/batch")
          .send({ usernames })
          .expect(200);

        expect(response.body).toEqual(mockBatchResult);
        expect(daemonAPI.batchSearchUsernames).toHaveBeenCalledWith(usernames);
      });

      it("should reject empty usernames array", async () => {
        const response = await request(app)
          .post("/api/daemon-risk-engine/daemon-osint/search/batch")
          .send({ usernames: [] })
          .expect(400);

        expect(response.body).toEqual({ error: "Usernames array is required" });
      });
    });
  });

  describe("IP Tracer Endpoints", () => {
    describe("GET /api/daemon-risk-engine/daemon-ip/lookup", () => {
      it("should lookup IP address", async () => {
        const ip = "8.8.8.8";
        const mockLookupResult = {
          ip,
          country: "United States",
          countryCode: "US",
          city: "Mountain View",
          isp: "Google LLC",
          isVPN: false
        };

        (daemonAPI.lookupIP as any).mockResolvedValueOnce({
          success: true,
          data: mockLookupResult
        });

        const response = await request(app)
          .get("/api/daemon-risk-engine/daemon-ip/lookup")
          .query({ ip })
          .expect(200);

        expect(response.body).toEqual(mockLookupResult);
        expect(daemonAPI.lookupIP).toHaveBeenCalledWith(ip, undefined, false, false);
      });

      it("should handle optional parameters", async () => {
        const ip = "1.1.1.1";
        const fields = "country,city,isp";

        (daemonAPI.lookupIP as any).mockResolvedValueOnce({
          success: true,
          data: { ip }
        });

        await request(app)
          .get("/api/daemon-risk-engine/daemon-ip/lookup")
          .query({
            ip,
            fields,
            include_hostname: "true",
            include_security: "true"
          })
          .expect(200);

        expect(daemonAPI.lookupIP).toHaveBeenCalledWith(ip, fields, true, true);
      });
    });
  });
});