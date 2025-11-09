import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  daemonAPI,
  type AnalysisResult,
  type WalletRiskScore,
  type SolanaTransaction,
  type SolanaBalanceChange,
  type TokenMetadata,
  type NFTMetadata,
  type ETHBalance,
  type ETHTransaction,
  type OSINTSearchResult,
  type OSINTAnalysis,
  type OSINTRiskAssessment,
  type IPLookup,
  type SystemPrompt,
  type ApiResponse,
  type ChatRequest
} from '@shared/lib/daemon-api-client';

// ========================================
// Utility hooks
// ========================================

export const useApiError = () => {
  const handleError = useCallback((error: unknown, fallbackMessage = 'An error occurred') => {
    let message = fallbackMessage;

    if (error && typeof error === 'object' && 'message' in error) {
      message = (error as any).message;
    } else if (typeof error === 'string') {
      message = error;
    }

    toast.error(message);
    return message;
  }, []);

  return { handleError };
};

// ========================================
// Health and Info hooks
// ========================================

export const useDaemonHealth = () => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'health'],
    queryFn: async () => {
      const response = await daemonAPI.getHealth();
      if (!response.success) {
        throw new Error(response.error || 'Health check failed');
      }
      return response.data;
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  });
};

export const useDaemonInfo = () => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'info'],
    queryFn: async () => {
      const response = await daemonAPI.getAPIInfo();
      if (!response.success) {
        throw new Error(response.error || 'Failed to get API info');
      }
      return response.data;
    },
    staleTime: 3600000, // 1 hour
  });
};

// ========================================
// Chat hooks
// ========================================

export const useChatWithDaemon = () => {
  const { handleError } = useApiError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ChatRequest) => {
      const response = await daemonAPI.chatWithDaemon(request);
      if (!response.success) {
        throw new Error(response.error || 'Chat request failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to send chat message'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daemon-risk-engine'] });
    },
  });
};

export const useSystemPrompts = () => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'system-prompts'],
    queryFn: async () => {
      const response = await daemonAPI.getSystemPrompts();
      if (!response.success) {
        throw new Error(response.error || 'Failed to get system prompts');
      }
      return response.data;
    },
    staleTime: 3600000, // 1 hour
  });
};

// ========================================
// Analysis hooks
// ========================================

export const useAddressAnalysis = (address?: string, enabled = false) => {
  const { handleError } = useApiError();

  return useQuery({
    queryKey: ['daemon-risk-engine', 'analysis', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.analyzeSync(address);
      if (!response.success) {
        throw new Error(response.error || 'Analysis failed');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 300000, // 5 minutes
  });
};

export const useAnalyzeAddress = () => {
  const { handleError } = useApiError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: string) => {
      const response = await daemonAPI.analyzeSync(address);
      if (!response.success) {
        throw new Error(response.error || 'Analysis failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to analyze address'),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['daemon-risk-engine', 'analysis', variables], data);
      toast.success('Address analysis completed');
    },
  });
};

export const useBatchAnalysis = () => {
  const { handleError } = useApiError();

  return useMutation({
    mutationFn: async ({ addresses, limit }: { addresses: string[]; limit?: number }) => {
      const response = await daemonAPI.analyzeBatch(addresses, limit);
      if (!response.success) {
        throw new Error(response.error || 'Batch analysis failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to analyze addresses'),
    onSuccess: () => {
      toast.success('Batch analysis completed');
    },
  });
};

export const useWalletRiskScore = (address?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'risk-score', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.getWalletRiskScore(address);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get risk score');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 60000, // 1 minute
  });
};

export const useExportPDFReport = () => {
  const { handleError } = useApiError();

  return useMutation({
    mutationFn: async (address: string) => {
      const response = await daemonAPI.exportPDFReport(address);
      if (!response.success) {
        throw new Error(response.error || 'Failed to export PDF report');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to export PDF report'),
    onSuccess: () => {
      toast.success('PDF report generated successfully');
    },
  });
};

// ========================================
// Solana hooks
// ========================================

export const useSolanaTransactions = (address?: string, limit = 20, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'solana', 'transactions', address, limit],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.getSolanaAddressTransactions(address, limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get transactions');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 60000, // 1 minute
  });
};

export const useSolanaBalanceChanges = (address?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'solana', 'balance-changes', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.getSolanaBalanceChanges(address);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get balance changes');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 60000, // 1 minute
  });
};

export const useTokenMetadata = (mint?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'solana', 'token-metadata', mint],
    queryFn: async () => {
      if (!mint) throw new Error('Mint address is required');
      const response = await daemonAPI.getSolanaTokenMetadata(mint);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get token metadata');
      }
      return response.data;
    },
    enabled: enabled && !!mint,
    staleTime: 3600000, // 1 hour
  });
};

export const useNFTMetadata = (mint?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'solana', 'nft-metadata', mint],
    queryFn: async () => {
      if (!mint) throw new Error('Mint address is required');
      const response = await daemonAPI.getSolanaNFTMetadata(mint);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get NFT metadata');
      }
      return response.data;
    },
    enabled: enabled && !!mint,
    staleTime: 3600000, // 1 hour
  });
};

// ========================================
// Ethereum hooks
// ========================================

export const useETHBalance = (address?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'ethereum', 'balance', address],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.getETHBalance(address);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get ETH balance');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 30000, // 30 seconds
  });
};

export const useETHTransactions = (address?: string, page = 1, offset = 10, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'ethereum', 'transactions', address, page, offset],
    queryFn: async () => {
      if (!address) throw new Error('Address is required');
      const response = await daemonAPI.getETHTxList(address, page, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get ETH transactions');
      }
      return response.data;
    },
    enabled: enabled && !!address,
    staleTime: 60000, // 1 minute
  });
};

// ========================================
// OSINT hooks
// ========================================

export const useUsernameSearch = (username?: string, includeNSFW = false, verify = true, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'osint', 'search', username, includeNSFW, verify],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      const response = await daemonAPI.searchUsername(username, includeNSFW, verify);
      if (!response.success) {
        throw new Error(response.error || 'Username search failed');
      }
      return response.data;
    },
    enabled: enabled && !!username,
    staleTime: 300000, // 5 minutes
  });
};

export const useSearchUsername = () => {
  const { handleError } = useApiError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, includeNSFW = false, verify = true }: {
      username: string;
      includeNSFW?: boolean;
      verify?: boolean;
    }) => {
      const response = await daemonAPI.searchUsername(username, includeNSFW, verify);
      if (!response.success) {
        throw new Error(response.error || 'Username search failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to search username'),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ['daemon-risk-engine', 'osint', 'search', variables.username, variables.includeNSFW, variables.verify],
        data
      );
      toast.success('Username search completed');
    },
  });
};

export const useUsernameFootprintAnalysis = (username?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'osint', 'footprint', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      const response = await daemonAPI.analyzeUsernameFootprint(username);
      if (!response.success) {
        throw new Error(response.error || 'Footprint analysis failed');
      }
      return response.data;
    },
    enabled: enabled && !!username,
    staleTime: 600000, // 10 minutes
  });
};

export const useAnalyzeUsernameFootprint = () => {
  const { handleError } = useApiError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const response = await daemonAPI.analyzeUsernameFootprint(username);
      if (!response.success) {
        throw new Error(response.error || 'Footprint analysis failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to analyze username footprint'),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['daemon-risk-engine', 'osint', 'footprint', variables], data);
      toast.success('Username footprint analysis completed');
    },
  });
};

export const useBatchUsernameSearch = () => {
  const { handleError } = useApiError();

  return useMutation({
    mutationFn: async (usernames: string[]) => {
      const response = await daemonAPI.batchSearchUsernames(usernames);
      if (!response.success) {
        throw new Error(response.error || 'Batch username search failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to search usernames'),
    onSuccess: () => {
      toast.success('Batch username search completed');
    },
  });
};

export const useOSINTRiskAssessment = (username?: string, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'osint', 'risk-assessment', username],
    queryFn: async () => {
      if (!username) throw new Error('Username is required');
      const response = await daemonAPI.getOSINTRiskAssessment(username);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get risk assessment');
      }
      return response.data;
    },
    enabled: enabled && !!username,
    staleTime: 300000, // 5 minutes
  });
};

// ========================================
// IP Tracer hooks
// ========================================

export const useIPLookup = (ip?: string, fields?: string, includeHostname = false, includeSecurity = false, enabled = false) => {
  return useQuery({
    queryKey: ['daemon-risk-engine', 'ip-tracer', 'lookup', ip, fields, includeHostname, includeSecurity],
    queryFn: async () => {
      const response = await daemonAPI.lookupIP(ip, fields, includeHostname, includeSecurity);
      if (!response.success) {
        throw new Error(response.error || 'IP lookup failed');
      }
      return response.data;
    },
    enabled: enabled,
    staleTime: 300000, // 5 minutes
  });
};

export const useLookupIP = () => {
  const { handleError } = useApiError();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ip,
      fields,
      includeHostname = false,
      includeSecurity = false
    }: {
      ip?: string;
      fields?: string;
      includeHostname?: boolean;
      includeSecurity?: boolean;
    }) => {
      const response = await daemonAPI.lookupIP(ip, fields, includeHostname, includeSecurity);
      if (!response.success) {
        throw new Error(response.error || 'IP lookup failed');
      }
      return response.data;
    },
    onError: (error) => handleError(error, 'Failed to lookup IP'),
    onSuccess: (data) => {
      // Cache the result if we have an IP
      if (data.ip) {
        queryClient.setQueryData(['daemon-risk-engine', 'ip-tracer', 'lookup', data.ip], data);
      }
      toast.success('IP lookup completed');
    },
  });
};

// ========================================
// Streaming analysis hook
// ========================================

export const useStreamingAnalysis = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const { handleError } = useApiError();

  const analyzeWithStreaming = useCallback(async (
    address: string,
    onChunk: (chunk: string) => void,
    onComplete: (result: any) => void,
    onError: (error: string) => void
  ) => {
    setIsStreaming(true);
    try {
      const stream = await daemonAPI.analyzeAddressStream(address);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          onChunk(chunk);
        }

        // Parse the complete response when done
        try {
          const result = JSON.parse(buffer);
          onComplete(result);
        } catch (e) {
          // If it's not JSON, pass the raw buffer
          onComplete({ data: buffer });
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Streaming analysis failed';
      handleError(error, errorMessage);
      onError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  }, [handleError]);

  return { analyzeWithStreaming, isStreaming };
};