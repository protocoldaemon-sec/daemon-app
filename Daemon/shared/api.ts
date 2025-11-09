/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Sign In With Solana (SIWS) types
 * Based on: https://github.com/phantom/sign-in-with-solana
 */
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";

/**
 * Request body for /api/siws/create
 * Can be empty (all fields optional) or include address for pre-filling
 */
export interface CreateSIWSRequest {
  address?: string;
}

/**
 * Response from /api/siws/create
 */
export interface CreateSIWSResponse {
  input: SolanaSignInInput;
}

/**
 * Request body for /api/siws/verify
 */
export interface VerifySIWSRequest {
  input: SolanaSignInInput;
  output: SolanaSignInOutput;
}

/**
 * Response from /api/siws/verify
 */
export interface VerifySIWSResponse {
  success: boolean;
  message?: string;
}