/**
 * Example usage of Solana RPC Connection
 * 
 * Based on: https://docs.solanamobile.com/react-native/making_rpc_requests
 * 
 * These examples show how to use the Connection class for making RPC requests
 * to interface with the Solana network.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  createConnection,
  getMainnetConnection,
  getDevnetConnection,
  getBalance,
  getAccountInfo,
  getTransaction,
  getLatestBlockhash,
} from "./solanaConnection";

/**
 * Example 1: Creating a Connection client
 * 
 * The Connection class represents a connection to a Solana RPC endpoint
 * and provides convenient functions to make RPC requests.
 */
export function example1_CreateConnection() {
  // Option 1: Use network name (recommended for mainnet/devnet)
  const mainnetConnection = createConnection("mainnet", "confirmed");
  const devnetConnection = createConnection("devnet", "confirmed");

  // Option 2: Use custom RPC endpoint
  const customConnection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  // Option 3: Use singleton (recommended for performance)
  const connection = getMainnetConnection(); // Reuses existing instance

  return connection;
}

/**
 * Example 2: Making RPC requests
 * 
 * After creation, call various asynchronous RPC functions and receive
 * responses from the RPC endpoint.
 */
export async function example2_MakeRPCRequests() {
  const connection = getMainnetConnection();

  try {
    // Get latest blockhash
    const blockhash = await connection.getLatestBlockhash();
    console.log("Latest blockhash:", blockhash.blockhash);

    // Get balance (returns lamports)
    const address = "YourSolanaAddressHere";
    const balanceInLamports = await getBalance(address, connection);
    const balanceInSOL = balanceInLamports / 1_000_000_000; // Convert to SOL
    console.log(`Balance: ${balanceInSOL} SOL`);

    // Get account info
    const accountInfo = await getAccountInfo(address, connection);
    console.log("Account info:", accountInfo);

    // Get transaction details
    const txSignature =
      "YourTransactionSignatureHere";
    const transaction = await getTransaction(txSignature, connection);
    console.log("Transaction:", transaction);
  } catch (error) {
    console.error("RPC request error:", error);
  }
}

/**
 * Example 3: Using in React component with hook
 */
export function example3_ReactHook() {
  // See client/hooks/useSolanaConnection.tsx
  // Usage in component:
  /*
  import { useSolanaConnection } from '@/hooks/useSolanaConnection';

  function MyComponent() {
    const { connection, getBalance, isLoading, error } = useSolanaConnection({
      network: 'mainnet'
    });

    const [balance, setBalance] = useState<number | null>(null);

    const fetchBalance = async (address: string) => {
      const bal = await getBalance(address);
      setBalance(bal);
    };

    return (
      <div>
        {isLoading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {balance !== null && <p>Balance: {balance / 1e9} SOL</p>}
      </div>
    );
  }
  */
}

/**
 * Example 4: Batch requests with getMultipleAccounts
 */
export async function example4_BatchRequests() {
  const connection = getMainnetConnection();

  const addresses = [
    "Address1",
    "Address2",
    "Address3",
  ].map((addr) => new PublicKey(addr));

  try {
    const accounts = await connection.getMultipleAccountsInfo(addresses);
    console.log("Multiple accounts:", accounts);
  } catch (error) {
    console.error("Batch request error:", error);
  }
}

/**
 * Example 5: Working with different networks
 */
export function example5_DifferentNetworks() {
  // Mainnet connection
  const mainnet = getMainnetConnection();

  // Devnet connection
  const devnet = getDevnetConnection();

  // Testnet connection
  const testnet = createConnection("testnet");

  // Custom RPC provider (e.g., Helius, QuickNode)
  const custom = createConnection(
    "https://your-custom-rpc-provider.com"
  );

  return { mainnet, devnet, testnet, custom };
}

/**
 * Reference: Available RPC Methods
 * 
 * The Connection class provides many RPC methods:
 * 
 * - getBalance(publicKey)
 * - getAccountInfo(publicKey)
 * - getLatestBlockhash()
 * - getTransaction(signature)
 * - getMultipleAccountsInfo(publicKeys)
 * - sendTransaction(transaction, signers)
 * - sendAndConfirmTransaction(transaction, signers)
 * - getTokenAccountBalance(tokenAccountAddress)
 * - getSlot()
 * - getBlockHeight()
 * - getProgramAccounts(programId)
 * - ... and many more
 * 
 * View the official @solana/web3.js documentation for the full list:
 * https://solana-labs.github.io/solana-web3.js/classes/Connection.html
 */

