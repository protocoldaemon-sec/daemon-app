/**
 * React hook for using Solana RPC Connection
 * 
 * Provides a Connection instance and common RPC methods
 * Based on: https://docs.solanamobile.com/react-native/making_rpc_requests
 */

import { useState, useEffect, useMemo } from "react";
import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import {
  createConnection,
  getMainnetConnection,
  getDevnetConnection,
  RPC_ENDPOINTS,
  type getBalance,
  type getAccountInfo,
  type getTransaction,
} from "@/utils/solanaConnection";

export type Network = "mainnet" | "devnet" | "testnet" | "custom";
export type ConnectionOptions = {
  network?: Network;
  endpoint?: string; // Custom RPC endpoint
  commitment?: Commitment;
};

/**
 * React hook for Solana RPC Connection
 * 
 * @param options - Connection configuration
 * @returns Connection instance and common RPC methods
 * 
 * @example
 * ```typescript
 * const { connection, getBalance, isLoading } = useSolanaConnection({ network: "mainnet" });
 * 
 * // Get balance
 * const balance = await getBalance("YourPublicKeyHere");
 * ```
 */
export function useSolanaConnection(options: ConnectionOptions = {}) {
  const { network = "mainnet", endpoint, commitment } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create connection instance (memoized)
  const connection = useMemo(() => {
    try {
      if (endpoint) {
        return createConnection(endpoint, commitment);
      }
      
      switch (network) {
        case "mainnet":
          return getMainnetConnection();
        case "devnet":
          return getDevnetConnection();
        case "testnet":
          return createConnection("testnet", commitment);
        case "custom":
          if (!endpoint) {
            throw new Error("Custom endpoint required for custom network");
          }
          return createConnection(endpoint, commitment);
        default:
          return getMainnetConnection();
      }
    } catch (err: any) {
      console.error("Error creating connection:", err);
      setError(err.message);
      return getMainnetConnection(); // Fallback
    }
  }, [network, endpoint, commitment]);

  /**
   * Get balance wrapper with loading state
   */
  const getBalance = async (
    address: string | PublicKey
  ): Promise<number | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const publicKey =
        typeof address === "string" ? new PublicKey(address) : address;
      const balance = await connection.getBalance(publicKey);
      return balance;
    } catch (err: any) {
      console.error("Error getting balance:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get account info wrapper with loading state
   */
  const getAccountInfo = async (address: string | PublicKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const publicKey =
        typeof address === "string" ? new PublicKey(address) : address;
      return await connection.getAccountInfo(publicKey);
    } catch (err: any) {
      console.error("Error getting account info:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get transaction wrapper with loading state
   */
  const getTransaction = async (signature: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await connection.getTransaction(signature);
    } catch (err: any) {
      console.error("Error getting transaction:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get latest blockhash wrapper
   */
  const getLatestBlockhash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      return await connection.getLatestBlockhash();
    } catch (err: any) {
      console.error("Error getting latest blockhash:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get multiple accounts wrapper
   */
  const getMultipleAccounts = async (addresses: (string | PublicKey)[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const publicKeys = addresses.map((addr) =>
        typeof addr === "string" ? new PublicKey(addr) : addr
      );
      return await connection.getMultipleAccountsInfo(publicKeys);
    } catch (err: any) {
      console.error("Error getting multiple accounts:", err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    connection,
    network,
    isLoading,
    error,
    getBalance,
    getAccountInfo,
    getTransaction,
    getLatestBlockhash,
    getMultipleAccounts,
    clearError: () => setError(null),
  };
}

