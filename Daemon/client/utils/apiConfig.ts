// API Configuration with secure key management
const BASE_URL = 'https://agent.daemonprotocol.com';

// SECURITY CRITICAL: API keys should NEVER be exposed in client-side code
// All API calls with authentication should go through our backend proxy
// This file now contains only non-sensitive configuration

export const API_CONFIG = {
  BASE_URL,
  HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

// Helper function to create basic headers (no authentication)
export const getBasicHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// SECURE API REQUEST FUNCTION
// All authenticated requests should go through our backend proxy endpoints
// This prevents API key exposure in client-side code
export const secureApiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Use our backend proxy endpoints instead of direct API calls
  const proxyUrl = `/api/daemon${endpoint}`;

  const headers = {
    ...getBasicHeaders(),
    ...options.headers,
  };

  try {
    const response = await fetch(proxyUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('Secure API Request failed:', error);
    throw error;
  }
};

// Legacy function for backward compatibility - DEPRECATED
// Use secureApiFetch instead for all new code
export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  console.warn('⚠️ authenticatedFetch is deprecated. Use secureApiFetch with backend proxy instead.');
  return secureApiFetch(endpoint, options);
};

export default API_CONFIG;