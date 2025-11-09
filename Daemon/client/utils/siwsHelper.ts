// Sign In With Solana (SIWS) helper
// Based on: https://github.com/phantom/sign-in-with-solana
// SIWS combines connect + signMessage into a secure one-step flow

import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";
import { verifySignIn } from "@solana/wallet-standard-util";
import { PublicKey } from "@solana/web3.js";
import type {
  CreateSIWSRequest,
  CreateSIWSResponse,
  VerifySIWSRequest,
  VerifySIWSResponse,
} from "@shared/api";

export interface SIWSInput {
  domain?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Create Sign In Input for SIWS
 * Following SIWS spec: https://github.com/phantom/sign-in-with-solana
 */
export function createSIWSInput(address?: string): SolanaSignInInput {
  const domain = typeof window !== 'undefined' ? window.location.hostname : 'daemonprotocol.com';
  const uri = typeof window !== 'undefined' ? window.location.origin : 'https://daemonprotocol.com';
  
  // Generate nonce for security
  const nonce = generateNonce();
  
  const input: SolanaSignInInput = {
    domain,
    statement: 'Sign in to Daemon Protocol',
    uri,
    version: '1',
    chainId: 'solana:mainnet-beta',
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    ...(address && { address }),
  };
  
  return input;
}

/**
 * Generate random nonce for SIWS
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify SIWS output
 * Based on: https://github.com/phantom/sign-in-with-solana#dapp-integration
 * and Solana Mobile docs: https://docs.solanamobile.com/reference/typescript/mobile-wallet-adapter#transact
 */
export function verifySIWS(
  input: SolanaSignInInput,
  output: SolanaSignInOutput
): boolean {
  try {
    // Serialize output for verification (as per official docs)
    const serialisedOutput: SolanaSignInOutput = {
      account: {
        publicKey: new Uint8Array(output.account.publicKey),
        ...output.account,
      },
      signature: new Uint8Array(output.signature),
      signedMessage: new Uint8Array(output.signedMessage),
    };
    
    // Use verifySignIn from @solana/wallet-standard-util
    return verifySignIn(input, serialisedOutput);
  } catch (error) {
    console.error('SIWS verification error:', error);
    return false;
  }
}

/**
 * Extract address from SIWS output
 * Uses @solana/web3.js PublicKey for proper base58 conversion
 */
export function getAddressFromSIWS(output: SolanaSignInOutput): string {
  try {
    // Check if address is directly available in account
    if (output.account && 'address' in output.account && typeof output.account.address === 'string') {
      return output.account.address;
    }
    
    const publicKey = output.account.publicKey;
    
    // If already a string (base58), return it
    if (typeof publicKey === 'string') {
      try {
        // Validate it's a valid Solana address
        new PublicKey(publicKey);
        return publicKey;
      } catch {
        return publicKey; // Return as-is if validation fails
      }
    }
    
    // Convert Uint8Array or Array to PublicKey
    if (publicKey instanceof Uint8Array || Array.isArray(publicKey)) {
      const keyBytes = publicKey instanceof Uint8Array ? publicKey : new Uint8Array(publicKey);
      const pubkey = new PublicKey(keyBytes);
      return pubkey.toBase58(); // Convert to base58 Solana address
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting address from SIWS:', error);
    return '';
  }
}

/**
 * Create Sign-In Input server-side (recommended)
 * Calls backend /api/siws/create endpoint
 * According to SIWS spec, input should be generated server-side for security
 */
export async function createSIWSInputFromServer(
  address?: string
): Promise<SolanaSignInInput> {
  try {
    const requestBody: CreateSIWSRequest = {};
    if (address) {
      requestBody.address = address;
    }

    const response = await fetch("/api/siws/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to create SIWS input: ${response.statusText}`);
    }

    const data: CreateSIWSResponse = await response.json();
    return data.input;
  } catch (error) {
    console.error("Error fetching SIWS input from server:", error);
    // Fallback to client-side generation
    return createSIWSInput(address);
  }
}

/**
 * Verify SIWS output server-side (recommended)
 * Calls backend /api/siws/verify endpoint
 * Server-side verification is recommended for production apps
 */
export async function verifySIWSOnServer(
  input: SolanaSignInInput,
  output: SolanaSignInOutput
): Promise<boolean> {
  try {
    // Convert Uint8Array fields to arrays for JSON serialization
    // The backend will convert these back to Uint8Array for verification
    const serializedOutput = {
      account: {
        publicKey:
          output.account.publicKey instanceof Uint8Array
            ? Array.from(output.account.publicKey)
            : Array.isArray(output.account.publicKey)
            ? output.account.publicKey
            : output.account.publicKey,
        ...output.account,
      },
      signature:
        output.signature instanceof Uint8Array
          ? Array.from(output.signature)
          : Array.isArray(output.signature)
          ? output.signature
          : output.signature,
      signedMessage:
        output.signedMessage instanceof Uint8Array
          ? Array.from(output.signedMessage)
          : Array.isArray(output.signedMessage)
          ? output.signedMessage
          : output.signedMessage,
    };

    const requestBody: VerifySIWSRequest = {
      input,
      output: serializedOutput as any, // Type assertion needed for JSON serialization
    };

    const response = await fetch("/api/siws/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to verify SIWS: ${response.statusText}`);
    }

    const data: VerifySIWSResponse = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error verifying SIWS on server:", error);
    // Fallback to client-side verification
    return verifySIWS(input, output);
  }
}

