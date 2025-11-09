import { RequestHandler } from "express";
import type {
  SolanaSignInInput,
  SolanaSignInOutput,
} from "@solana/wallet-standard-features";
import { verifySignIn } from "@solana/wallet-standard-util";
import {
  CreateSIWSRequest,
  CreateSIWSResponse,
  VerifySIWSRequest,
  VerifySIWSResponse,
} from "@shared/api";

/**
 * Generate a random nonce for SIWS security
 * Minimum 8 alphanumeric characters as per spec
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Create Sign-In Input for SIWS
 * POST /api/siws/create
 * 
 * According to SIWS spec, all fields are optional.
 * If domain/address not provided, wallet will determine them.
 * 
 * Body: { address?: string }
 * Response: { input: SolanaSignInInput }
 */
export const createSignInData: RequestHandler<
  {},
  CreateSIWSResponse,
  CreateSIWSRequest
> = async (req, res) => {
  try {
    const now = new Date();
    const { address } = req.body;

    // Extract domain and URI from request headers (server-side)
    // In a browser context, these would come from window.location
    const hostname = req.get("host") || "daemonprotocol.com";
    const protocol = req.get("x-forwarded-proto") || "https";
    const uri = `${protocol}://${hostname}${req.originalUrl.split("/api")[0]}`;

    // Generate nonce for security (prevents replay attacks)
    const nonce = generateNonce();

    // Convert Date to ISO 8601 string
    const currentDateTime = now.toISOString();

    // Create sign-in input following SIWS spec
    // All fields are optional - wallet will construct the message
    const signInData: SolanaSignInInput = {
      domain: hostname,
      statement:
        "Clicking Sign or Approve only means you have proved this wallet is owned by you. This request will not trigger any blockchain transaction or cost any gas fee.",
      uri: uri,
      version: "1",
      nonce: nonce,
      chainId: "mainnet", // Can be: mainnet, testnet, devnet, localnet, or solana:mainnet, etc.
      issuedAt: currentDateTime,
      // Optional: Add resources if needed
      // resources: ["https://example.com", "https://phantom.app/"],
      // Optional: Add expiration time (5 minutes from now)
      expirationTime: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      // Include address if provided
      ...(address && { address }),
    };

    const response: CreateSIWSResponse = {
      input: signInData,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error("Error creating SIWS input:", error);
    res.status(500).json({
      input: {},
    });
  }
};

/**
 * Verify Sign-In Output from wallet
 * POST /api/siws/verify
 * 
 * Body: { input: SolanaSignInInput, output: SolanaSignInOutput }
 * Response: { success: boolean, message?: string }
 */
export const verifySIWS: RequestHandler<
  {},
  VerifySIWSResponse,
  VerifySIWSRequest
> = (req, res) => {
  try {
    const { input, output } = req.body;

    if (!input || !output) {
      return res.status(400).json({
        success: false,
        message: "Missing input or output in request body",
      });
    }

    // Convert arrays back to Uint8Array for verification
    // JSON serialization converts Uint8Array to arrays, so we need to restore them
    const serialisedOutput: SolanaSignInOutput = {
      account: {
        publicKey:
          output.account.publicKey instanceof Array
            ? new Uint8Array(output.account.publicKey)
            : output.account.publicKey instanceof Uint8Array
            ? output.account.publicKey
            : new Uint8Array(output.account.publicKey),
        ...output.account,
      },
      signature:
        output.signature instanceof Array
          ? new Uint8Array(output.signature)
          : output.signature instanceof Uint8Array
          ? output.signature
          : new Uint8Array(output.signature),
      signedMessage:
        output.signedMessage instanceof Array
          ? new Uint8Array(output.signedMessage)
          : output.signedMessage instanceof Uint8Array
          ? output.signedMessage
          : new Uint8Array(output.signedMessage),
    };

    // Use verifySignIn from @solana/wallet-standard-util
    // This method:
    // 1. Parses and deconstructs the signedMessage
    // 2. Checks extracted fields against input fields
    // 3. Re-constructs the message according to ABNF format
    // 4. Verifies the message signature
    const isValid = verifySignIn(input, serialisedOutput);

    if (isValid) {
      res.status(200).json({
        success: true,
        message: "Sign-in verification successful",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Sign-in verification failed",
      });
    }
  } catch (error: any) {
    console.error("Error verifying SIWS:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during verification",
    });
  }
};

