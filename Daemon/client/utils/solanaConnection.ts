/**
 * Solana RPC Connection Utility
 * 
 * Based on: https://docs.solanamobile.com/react-native/making_rpc_requests
 * 
 * The Connection class represents a connection to a Solana RPC endpoint
 * and provides convenient functions to make RPC requests.
 * 
 * Since this is a web/Capacitor app (not React Native), polyfills are not needed.
 * @solana/web3.js works natively in browser environments.
 */

import { Connection, PublicKey, Commitment } from "@solana/web3.js";

// Default RPC endpoints
export const RPC_ENDPOINTS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  // You can also use custom RPC providers like Helius, QuickNode, etc.
  // mainnet: "https://your-custom-rpc-provider.com",
} as const;

// Default commitment level
const DEFAULT_COMMITMENT: Commitment = "confirmed";

/**
 * Create a Connection instance for making RPC requests
 * 
 * @param endpoint - RPC endpoint URL or network name (mainnet, devnet, testnet)
 * @param commitment - Commitment level (default: "confirmed")
 * @returns Connection instance that can be reused throughout the application
 * 
 * @example
 * ```typescript
 * const connection = createConnection("mainnet");
 * const blockhash = await connection.getLatestBlockhash();
 * ```
 */
export function createConnection(
  endpoint: keyof typeof RPC_ENDPOINTS | string = "mainnet",
  commitment: Commitment = DEFAULT_COMMITMENT
): Connection {
  // If endpoint is a key in RPC_ENDPOINTS, use the URL
  const rpcUrl =
    endpoint in RPC_ENDPOINTS
      ? RPC_ENDPOINTS[endpoint as keyof typeof RPC_ENDPOINTS]
      : endpoint;

  return new Connection(rpcUrl, commitment);
}

/**
 * Singleton Connection instance for mainnet
 * Can be reused throughout the application for better performance
 */
let mainnetConnection: Connection | null = null;

/**
 * Get or create a singleton mainnet Connection
 * Reusing the same Connection instance is recommended for better performance
 */
export function getMainnetConnection(): Connection {
  if (!mainnetConnection) {
    mainnetConnection = createConnection("mainnet");
  }
  return mainnetConnection;
}

/**
 * Singleton Connection instance for devnet
 */
let devnetConnection: Connection | null = null;

/**
 * Get or create a singleton devnet Connection
 */
export function getDevnetConnection(): Connection {
  if (!devnetConnection) {
    devnetConnection = createConnection("devnet");
  }
  return devnetConnection;
}

/**
 * Common RPC request examples
 */

/**
 * Get the latest blockhash
 */
export async function getLatestBlockhash(
  connection: Connection = getMainnetConnection()
) {
  return await connection.getLatestBlockhash();
}

/**
 * Get balance of a Solana address
 * @param address - Public key as string or PublicKey instance
 * @param connection - Connection instance (default: mainnet)
 * @returns Balance in lamports
 */
export async function getBalance(
  address: string | PublicKey,
  connection: Connection = getMainnetConnection()
): Promise<number> {
  const publicKey =
    typeof address === "string" ? new PublicKey(address) : address;
  return await connection.getBalance(publicKey);
}

/**
 * Get account info for a Solana address
 */
export async function getAccountInfo(
  address: string | PublicKey,
  connection: Connection = getMainnetConnection()
) {
  const publicKey =
    typeof address === "string" ? new PublicKey(address) : address;
  return await connection.getAccountInfo(publicKey);
}

/**
 * Get transaction details
 */
export async function getTransaction(
  signature: string,
  connection: Connection = getMainnetConnection()
) {
  return await connection.getTransaction(signature);
}

/**
 * Get multiple account info at once (batch request)
 */
export async function getMultipleAccounts(
  addresses: (string | PublicKey)[],
  connection: Connection = getMainnetConnection()
) {
  const publicKeys = addresses.map((addr) =>
    typeof addr === "string" ? new PublicKey(addr) : addr
  );
  return await connection.getMultipleAccountsInfo(publicKeys);
}

/**
 * Send and confirm a transaction
 * Note: For sending transactions, you typically use the wallet's sendTransaction method.
 * This is for programmatic sending.
 */
export async function sendAndConfirmTransaction(
  transaction: any, // Transaction type from @solana/web3.js
  signers: any[], // Signer array
  connection: Connection = getMainnetConnection()
) {
  return await connection.sendAndConfirmTransaction(transaction, signers);
}

/**
 * Get token account balance for SPL tokens
 */
export async function getTokenAccountBalance(
  tokenAccountAddress: string | PublicKey,
  connection: Connection = getMainnetConnection()
) {
  const publicKey =
    typeof tokenAccountAddress === "string"
      ? new PublicKey(tokenAccountAddress)
      : tokenAccountAddress;
  return await connection.getTokenAccountBalance(publicKey);
}

