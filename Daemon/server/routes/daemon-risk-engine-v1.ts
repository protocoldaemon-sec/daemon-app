import { Request, Response } from 'express';
import { daemonAPI } from '../../shared/lib/daemon-api-client';

// ========================================
// Daemon Risk Engine v1 Chat Endpoints
// ========================================

export const chatWithDaemonV1 = async (req: Request, res: Response) => {
  try {
    const result = await daemonAPI.chatWithDaemonV1(req.body);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in chatWithDaemonV1:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const chatWithDaemonStreamV1 = async (req: Request, res: Response) => {
  try {
    const stream = await daemonAPI.chatWithDaemonStreamV1(req.body);

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
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            res.write(`data: ${line}\n\n`);
          }
        }
      }
    } finally {
      reader.releaseLock();
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Error in chatWithDaemonStreamV1:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// ========================================
// Daemon Risk Engine v1 Analysis Endpoints
// ========================================

export const analyzeAddressV1 = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await daemonAPI.analyzeAddressV1(address);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in analyzeAddressV1:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const analyzeAddressBatchV1 = async (req: Request, res: Response) => {
  try {
    const { addresses } = req.body;
    const result = await daemonAPI.analyzeAddressBatchV1(addresses);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in analyzeAddressBatchV1:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// Daemon Risk Engine v1 Check Endpoints
// ========================================

export const checkSignature = async (req: Request, res: Response) => {
  try {
    const { signature } = req.params;
    const { address } = req.query;
    const result = await daemonAPI.checkSignature(signature, address as string);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in checkSignature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkPayment = async (req: Request, res: Response) => {
  try {
    const { hash, recipient } = req.query;

    if (!hash || !recipient) {
      return res.status(400).json({ error: 'Missing hash or recipient parameter' });
    }

    const result = await daemonAPI.checkPayment(hash as string, recipient as string);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in checkPayment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkActivity = async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    if (!period) {
      return res.status(400).json({ error: 'Missing period parameter' });
    }

    const result = await daemonAPI.checkActivity(period as string);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in checkActivity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// Bitcoin Endpoints
// ========================================

export const getBitcoinAddressBalance = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await daemonAPI.getBitcoinAddressBalance(address);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinAddressBalance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBitcoinAddressStats = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await daemonAPI.getBitcoinAddressStats(address);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinAddressStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBitcoinTransactionDetails = async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;
    const result = await daemonAPI.getBitcoinTransactionDetails(txid);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinTransactionDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBitcoinBlockStats = async (req: Request, res: Response) => {
  try {
    const { blockNumber } = req.params;
    const result = await daemonAPI.getBitcoinBlockStats(blockNumber ? parseInt(blockNumber) : undefined);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinBlockStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBitcoinDominance = async (req: Request, res: Response) => {
  try {
    const result = await daemonAPI.getBitcoinDominance();

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinDominance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBitcoinFearGreedIndex = async (req: Request, res: Response) => {
  try {
    const result = await daemonAPI.getBitcoinFearGreedIndex();

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getBitcoinFearGreedIndex:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// Dogecoin Endpoints
// ========================================

export const getDogecoinAddressBalance = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await daemonAPI.getDogecoinAddressBalance(address);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getDogecoinAddressBalance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDogecoinPrice = async (req: Request, res: Response) => {
  try {
    const result = await daemonAPI.getDogecoinPrice();

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getDogecoinPrice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// Analytics Endpoints
// ========================================

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing token parameter' });
    }

    const result = await daemonAPI.getAnalytics(token as string);

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getAnalytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAptosAddressTransactions = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit } = req.query;
    const result = await daemonAPI.getAptosAddressTransactions(
      address,
      limit ? parseInt(limit as string) : undefined
    );

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getAptosAddressTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getArbitrumAddressTransactions = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { limit, page } = req.query;
    const result = await daemonAPI.getArbitrumAddressTransactions(
      address,
      limit ? parseInt(limit as string) : undefined,
      page ? parseInt(page as string) : undefined
    );

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error in getArbitrumAddressTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};