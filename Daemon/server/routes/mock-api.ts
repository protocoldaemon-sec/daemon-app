import { Request, Response } from 'express';

// Mock data for testing our integration
export const mockHealthCheck = async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Daemon Risk Engine API - Mock',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Error in mockHealthCheck:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const mockChatWithDaemon = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Simulate a response from Daemon
    res.json({
      response: `I received your message: "${message}". This is a mock response demonstrating that the API integration is working correctly.`,
      timestamp: new Date().toISOString(),
      source: 'Mock Daemon API'
    });
  } catch (error) {
    console.error('Error in mockChatWithDaemon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const mockAnalyzeAddress = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Mock analysis result
    res.json({
      address,
      riskScore: Math.floor(Math.random() * 100),
      riskLevel: Math.random() > 0.5 ? 'Medium' : 'Low',
      analysis: {
        balance: Math.random() * 10,
        transactions: Math.floor(Math.random() * 1000),
        firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'Mock Analysis API'
    });
  } catch (error) {
    console.error('Error in mockAnalyzeAddress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const mockBitcoinStats = async (req: Request, res: Response) => {
  try {
    // Mock Bitcoin data
    res.json({
      bitcoin: {
        price: 45000 + Math.random() * 10000,
        dominance: 45 + Math.random() * 10,
        fearGreedIndex: Math.floor(Math.random() * 100),
        marketCap: 800000000000 + Math.random() * 100000000000
      },
      timestamp: new Date().toISOString(),
      source: 'Mock Bitcoin API'
    });
  } catch (error) {
    console.error('Error in mockBitcoinStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};