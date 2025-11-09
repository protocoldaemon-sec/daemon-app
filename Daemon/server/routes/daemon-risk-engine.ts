import type { RequestHandler } from "express";
import { daemonAPI } from "../../shared/lib/daemon-api-client";

const DAEMON_RISK_ENGINE_BASE = "https://daemonriskengine.io";
// SECURITY: API key loaded from environment variables
const DAEMON_API_KEY = process.env.DAEMON_API_KEY || "";

// Validate API key is present in production
if (process.env.NODE_ENV === 'production' && !DAEMON_API_KEY) {
  console.error('🚨 SECURITY ERROR: DAEMON_API_KEY environment variable is required in production');
  throw new Error('DAEMON_API_KEY environment variable is required in production');
}

// Generic proxy handler for Daemon Risk Engine API
export const proxyDaemonRiskEngine: RequestHandler = async (req, res) => {
  try {
    const path = req.originalUrl.replace(/^\/?api\/daemon-risk-engine/, "");
    const url = `${DAEMON_RISK_ENGINE_BASE}${path}`;

    // Add API key to query parameters if not present
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('api_key') && DAEMON_API_KEY) {
      urlObj.searchParams.append('api_key', DAEMON_API_KEY);
    }

    const init: RequestInit = {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined as any,
        'Authorization': `Bearer ${DAEMON_API_KEY}`,
        'User-Agent': 'Daemon-Seeker-App/1.0.0'
      } as any,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = JSON.stringify(req.body ?? {});
      (init.headers as any)["content-type"] =
        (req.headers["content-type"] as string) || "application/json";
    }

    const r = await fetch(urlObj.toString(), init);
    res.status(r.status);

    // Copy headers
    r.headers.forEach((value, key) => {
      if (key !== 'transfer-encoding' && key !== 'connection') {
        res.setHeader(key, value);
      }
    });

    if (!r.body) return res.end();

    // Stream passthrough for SSE/text
    for await (const chunk of r.body as any) {
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    console.error('Daemon Risk Engine proxy error:', e);
    res.status(500).json({ error: "daemon_risk_engine_proxy_error", message: e instanceof Error ? e.message : "Unknown error" });
  }
};

// ========================================
// Specific endpoint handlers with better error handling
// ========================================

// Health and Info
export const getHealth: RequestHandler = async (req, res) => {
  try {
    const response = await daemonAPI.getHealth();
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getAPIInfo: RequestHandler = async (req, res) => {
  try {
    const response = await daemonAPI.getAPIInfo();
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// Chat endpoints
// ========================================

export const chatWithDaemon: RequestHandler = async (req, res) => {
  try {
    const response = await daemonAPI.chatWithDaemon(req.body);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const chatWithDaemonStream: RequestHandler = async (req, res) => {
  try {
    const stream = await daemonAPI.chatWithDaemonStream(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getSystemPrompts: RequestHandler = async (req, res) => {
  try {
    const response = await daemonAPI.getSystemPrompts();
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// Analysis endpoints
// ========================================

export const analyzeAddress: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;
    const { apiKey } = req.query;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if streaming is requested
    if (req.query.stream === 'true') {
      const stream = await daemonAPI.analyzeAddressStream(address, apiKey as string);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const response = await daemonAPI.analyzeSync(address);
      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({ error: response.error });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const analyzeAddressAlternative: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    // Check if streaming is requested
    if (req.query.stream === 'true') {
      const stream = await daemonAPI.analyzeAddressAlternativeStream(address);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const response = await daemonAPI.analyzeSyncAlternative(address);
      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({ error: response.error });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const analyzeBatch: RequestHandler = async (req, res) => {
  try {
    const { addresses } = req.body;
    const { limit } = req.query;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: "Addresses array is required" });
    }

    const response = await daemonAPI.analyzeBatch(addresses, limit ? parseInt(limit as string) : undefined);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getWalletRiskScore: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.getWalletRiskScore(address);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const exportPDFReport: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.exportPDFReport(address);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// Solana endpoints
// ========================================

export const getSolanaTransactions: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 20 } = req.query;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.getSolanaAddressTransactions(address, parseInt(limit as string));
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getSolanaBalanceChanges: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.getSolanaBalanceChanges(address);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getSolanaTokenMetadata: RequestHandler = async (req, res) => {
  try {
    const { mint } = req.params;

    if (!mint) {
      return res.status(400).json({ error: "Mint address is required" });
    }

    const response = await daemonAPI.getSolanaTokenMetadata(mint);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// Ethereum endpoints
// ========================================

export const getETHBalance: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.getETHBalance(address);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getETHTxList: RequestHandler = async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, offset = 10, sort = 'asc' } = req.query;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await daemonAPI.getETHTxList(
      address,
      parseInt(page as string),
      parseInt(offset as string),
      sort as string
    );
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// OSINT endpoints
// ========================================

export const searchUsername: RequestHandler = async (req, res) => {
  try {
    const { username } = req.params;
    const { include_nsfw = false, verify = true } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const response = await daemonAPI.searchUsername(
      username,
      include_nsfw === 'true',
      verify === 'true'
    );
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const analyzeUsernameFootprint: RequestHandler = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const response = await daemonAPI.analyzeUsernameFootprint(username);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const batchSearchUsernames: RequestHandler = async (req, res) => {
  try {
    const { usernames } = req.body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ error: "Usernames array is required" });
    }

    const response = await daemonAPI.batchSearchUsernames(usernames);
    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// ========================================
// IP Tracer endpoints
// ========================================

export const lookupIP: RequestHandler = async (req, res) => {
  try {
    const { ip, fields, include_hostname = false, include_security = false } = req.query;

    const response = await daemonAPI.lookupIP(
      ip as string,
      fields as string,
      include_hostname === 'true',
      include_security === 'true'
    );

    if (response.success) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: response.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
};