import { useState, useCallback } from 'react';

interface DaemonAPIConfig {
  apiKey: string;
  baseUrl: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  analysis_data?: any;
}

interface ChatResponse {
  message: string;
  analysis_data?: any;
  timestamp: string;
}

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  template: string;
}

const API_CONFIG: DaemonAPIConfig = {
  apiKey: import.meta.env.VITE_DAEMON_API_KEY || '',
  baseUrl: import.meta.env.VITE_DAEMON_API_BASE_URL || 'https://agent.daemonprotocol.com'
};

export function useDaemonAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    if (!API_CONFIG.apiKey) {
      throw new Error('API key is not configured');
    }

    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_CONFIG.apiKey,
      ...options.headers,
    };

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chat with Daemon AI
  const chatWithDaemon = useCallback(async (
    messages: ChatMessage[],
    options: {
      system_prompt?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<ChatResponse> => {
    return makeRequest('/chat-daemon', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        system_prompt: options.system_prompt,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
      }),
    });
  }, [makeRequest]);

  // Stream chat with Daemon AI
  const streamChatWithDaemon = useCallback(async (
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options: {
      system_prompt?: string;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<void> => {
    if (!API_CONFIG.apiKey) {
      throw new Error('API key is not configured');
    }

    const url = `${API_CONFIG.baseUrl}/chat-daemon-stream`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_CONFIG.apiKey,
    };

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages,
          system_prompt: options.system_prompt,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed.content || parsed.text || '');
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get system prompts
  const getSystemPrompts = useCallback(async (): Promise<SystemPrompt[]> => {
    return makeRequest('/chat-daemon/system-prompts');
  }, [makeRequest]);

  // Address analysis
  const analyzeAddress = useCallback(async (
    address: string,
    blockchain: 'solana' | 'ethereum' | 'polygon' = 'solana'
  ) => {
    return makeRequest(`/analyze/${blockchain}/${address}`);
  }, [makeRequest]);

  // OSINT username search
  const searchUsername = useCallback(async (username: string, platforms?: string[]) => {
    const params = new URLSearchParams();
    params.append('username', username);
    if (platforms) {
      platforms.forEach(platform => params.append('platforms', platform));
    }

    return makeRequest(`/daemon-osint/username/search?${params.toString()}`);
  }, [makeRequest]);

  // IP geolocation
  const analyzeIP = useCallback(async (ipAddress: string) => {
    return makeRequest(`/daemon-ip-tracer/${ipAddress}`);
  }, [makeRequest]);

  // Health check
  const healthCheck = useCallback(async () => {
    try {
      await makeRequest('/health');
      return true;
    } catch {
      return false;
    }
  }, [makeRequest]);

  // Get API info
  const getAPIInfo = useCallback(async () => {
    return makeRequest('/info');
  }, [makeRequest]);

  return {
    isLoading,
    error,
    chatWithDaemon,
    streamChatWithDaemon,
    getSystemPrompts,
    analyzeAddress,
    searchUsername,
    analyzeIP,
    healthCheck,
    getAPIInfo,
    clearError: () => setError(null),
  };
}

// Utility function for creating chat messages
export const createChatMessage = (
  role: ChatMessage['role'],
  content: string,
  analysisData?: any
): ChatMessage => ({
  role,
  content,
  timestamp: new Date().toISOString(),
  analysis_data: analysisData,
});

// Error handling utility
export const handleAPIError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};