import { Request, Response, NextFunction } from 'express';

// Daemon Risk Engine API key
const DAEMON_API_KEY = 'dp_NbAXrjri2afah7neUTYwTPUtI2i67YdX';

// Optional: Allow requests from specific origins for additional security
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'https://localhost:8080',
  'https://localhost:8081'
];

/**
 * Middleware to authenticate requests using API key
 * For production, consider more secure authentication methods
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for health checks and ping endpoints
  if (req.path === '/api/ping' || req.path === '/api/health') {
    return next();
  }

  // Check origin for additional security
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`Unauthorized origin attempt: ${origin}`);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // For this integration, we're using server-side authentication
  // The API key is already configured in the daemonAPI client
  // In production, you might want to validate client-provided API keys
  next();
};

/**
 * Middleware to validate request body for chat endpoints
 */
export const validateChatRequest = (req: Request, res: Response, next: NextFunction) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid request body. Message is required and must be a string.'
    });
  }

  if (message.length > 10000) {
    return res.status(400).json({
      error: 'Message too long. Maximum 10,000 characters allowed.'
    });
  }

  next();
};

/**
 * Middleware to validate address parameters
 */
export const validateAddress = (req: Request, res: Response, next: NextFunction) => {
  const { address } = req.params;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({
      error: 'Address parameter is required.'
    });
  }

  // Basic address validation - adjust based on blockchain type
  if (address.length < 10 || address.length > 200) {
    return res.status(400).json({
      error: 'Invalid address format.'
    });
  }

  next();
};

/**
 * Middleware to validate batch analysis requests
 */
export const validateBatchRequest = (req: Request, res: Response, next: NextFunction) => {
  const { addresses } = req.body;

  if (!addresses || !Array.isArray(addresses)) {
    return res.status(400).json({
      error: 'Addresses array is required.'
    });
  }

  if (addresses.length === 0) {
    return res.status(400).json({
      error: 'At least one address is required.'
    });
  }

  if (addresses.length > 100) {
    return res.status(400).json({
      error: 'Too many addresses. Maximum 100 addresses allowed per batch.'
    });
  }

  // Validate each address
  for (const address of addresses) {
    if (typeof address !== 'string' || address.length < 10 || address.length > 200) {
      return res.status(400).json({
        error: `Invalid address format: ${address}`
      });
    }
  }

  next();
};

/**
 * Rate limiting middleware (simple implementation)
 * In production, use a proper rate limiting library like express-rate-limit
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (data.resetTime < windowStart) {
        requestCounts.delete(ip);
      }
    }

    // Get or create client data
    let clientData = requestCounts.get(clientIp);
    if (!clientData || clientData.resetTime < windowStart) {
      clientData = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientIp, clientData);
    }

    // Check rate limit
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  };
};

/**
 * CORS middleware for API endpoints
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.includes(origin as string)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};