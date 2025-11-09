// Adapter untuk menggunakan official MWA library (@solana-mobile/mobile-wallet-adapter-protocol-web3js)
// dengan WebView Android bridge
// Based on: https://docs.solanamobile.com/reference/typescript/mobile-wallet-adapter#transact

import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

// Create custom transport layer for WebView Android
// Official library expects a transport, but we bridge to native Android

interface WebViewTransport {
  send: (message: any) => Promise<any>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

class AndroidWebViewTransport implements WebViewTransport {
  private messageQueue: Array<{ resolve: (value: any) => void; reject: (error: any) => void; message: any }> = [];
  private requestId = 0;

  async connect(): Promise<void> {
    // Transport connected via Android bridge
    console.log('Android WebView transport connected');
  }

  async disconnect(): Promise<void> {
    console.log('Android WebView transport disconnected');
  }

  async send(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = { id, ...message };

      // Listen for response
      const handleResponse = (event: CustomEvent) => {
        if (event.detail.id === id) {
          window.removeEventListener('mwaResponse', handleResponse as EventListener);
          if (event.detail.error) {
            reject(new Error(event.detail.error));
          } else {
            resolve(event.detail.result);
          }
        }
      };

      window.addEventListener('mwaResponse', handleResponse as EventListener);

      // Send to Android bridge
      if (typeof (window as any).Android?.mwaTransact === 'function') {
        (window as any).Android.mwaTransact(JSON.stringify(request));
      } else {
        // Fallback: use existing MWA methods
        this.handleFallbackRequest(request, resolve, reject);
      }

      // Timeout
      setTimeout(() => {
        window.removeEventListener('mwaResponse', handleResponse as EventListener);
        reject(new Error('MWA request timeout'));
      }, 30000);
    });
  }

  private handleFallbackRequest(request: any, resolve: (value: any) => void, reject: (error: any) => void) {
    // Map official MWA methods to our existing Android bridge
    if (request.method === 'authorize') {
      const { identity, cluster, sign_in_payload } = request.params || {};
      
      // Use existing mwaAuthorize method
      const handleResult = (event: CustomEvent) => {
        window.removeEventListener('mwaAuthorizationResult', handleResult as EventListener);
        window.removeEventListener('mwaError', handleError as EventListener);
        
        const result = event.detail;
        if (result.error) {
          reject(new Error(result.error));
        } else {
          // Convert to official MWA format
          const accounts = (result.accounts || []).map((acc: any) => ({
            address: acc.address,
            label: acc.label,
            chains: ['solana:mainnet-beta'],
            ...(result.display_address && { display_address: result.display_address }),
          }));
          
          // Convert sign_in_result if present
          let signInResult = null;
          if (result.sign_in_result) {
            // Ensure proper format for SolanaSignInOutput
            const sr = result.sign_in_result;
            signInResult = {
              account: {
                publicKey: sr.account?.publicKey || sr.account,
                address: sr.account?.address,
                ...sr.account,
              },
              signature: sr.signature,
              signedMessage: sr.signed_message || sr.signedMessage,
            };
          }
          
          resolve({
            auth_token: result.auth_token,
            accounts,
            wallet_uri_base: result.wallet_uri_base,
            sign_in_result: signInResult,
          });
        }
      };

      const handleError = (event: CustomEvent) => {
        window.removeEventListener('mwaAuthorizationResult', handleResult as EventListener);
        window.removeEventListener('mwaError', handleError as EventListener);
        reject(new Error(event.detail.error || 'Authorization failed'));
      };

      window.addEventListener('mwaAuthorizationResult', handleResult as EventListener);
      window.addEventListener('mwaError', handleError as EventListener);

      const identityJson = JSON.stringify(identity || {});
      const clusterStr = cluster || 'solana:mainnet-beta';
      
      // Use sign_in_payload parameter in authorize (official MWA pattern)
      if (sign_in_payload && typeof (window as any).Android?.mwaAuthorizeWithSIWS === 'function') {
        const signInPayloadJson = JSON.stringify(sign_in_payload);
        (window as any).Android.mwaAuthorizeWithSIWS(identityJson, clusterStr, signInPayloadJson);
      } else if (sign_in_payload) {
        // Fallback: try regular authorize with sign_in_payload in params
        // Some implementations might handle it differently
        const paramsWithSIWS = {
          identity: identity || {},
          cluster: clusterStr,
          sign_in_payload: sign_in_payload,
        };
        const paramsJson = JSON.stringify(paramsWithSIWS);
        // Try calling mwaAuthorize with SIWS payload embedded
        if (typeof (window as any).Android?.mwaAuthorizeWithParams === 'function') {
          (window as any).Android.mwaAuthorizeWithParams(paramsJson);
        } else {
          // Last resort: use regular authorize (wallet might not support SIWS)
          (window as any).Android.mwaAuthorize(identityJson, clusterStr);
        }
      } else {
        (window as any).Android.mwaAuthorize(identityJson, clusterStr);
      }
    } else if (request.method === 'signMessages') {
      // Handle signMessages
      const { addresses, payloads } = request.params || {};
      
      const handleSignResult = (event: CustomEvent) => {
        window.removeEventListener('mwaSignMessagesResult', handleSignResult as EventListener);
        window.removeEventListener('mwaError', handleSignError as EventListener);
        
        const result = event.detail;
        if (result.error) {
          reject(new Error(result.error));
        } else {
          // Convert base64 signatures back to Uint8Array
          const signedMessages = (result.signedMessages || []).map((sig: string) => {
            return Uint8Array.from(atob(sig), c => c.charCodeAt(0));
          });
          resolve(signedMessages);
        }
      };

      const handleSignError = (event: CustomEvent) => {
        window.removeEventListener('mwaSignMessagesResult', handleSignResult as EventListener);
        window.removeEventListener('mwaError', handleSignError as EventListener);
        reject(new Error(event.detail.error || 'Sign messages failed'));
      };

      window.addEventListener('mwaSignMessagesResult', handleSignResult as EventListener);
      window.addEventListener('mwaError', handleSignError as EventListener);

      // Convert payloads to base64
      const payloadsBase64 = payloads.map((payload: Uint8Array) => 
        btoa(String.fromCharCode(...payload))
      );

      if (typeof (window as any).Android?.mwaSignMessages === 'function') {
        (window as any).Android.mwaSignMessages(
          JSON.stringify(addresses),
          JSON.stringify(payloadsBase64)
        );
      } else {
        reject(new Error('signMessages not supported by Android bridge'));
      }
    } else if (request.method === 'signTransactions' || request.method === 'signAndSendTransactions') {
      // Handle signTransactions (similar to signMessages but for transactions)
      const { transactions } = request.params || {};
      
      const handleTxResult = (event: CustomEvent) => {
        const eventName = request.method === 'signAndSendTransactions' 
          ? 'mwaSignAndSendTransactionsResult' 
          : 'mwaSignTransactionsResult';
        
        window.removeEventListener(eventName, handleTxResult as EventListener);
        window.removeEventListener('mwaError', handleTxError as EventListener);
        
        const result = event.detail;
        if (result.error) {
          reject(new Error(result.error));
        } else {
          if (request.method === 'signAndSendTransactions') {
            // Return signatures as string array
            resolve(result.signatures || []);
          } else {
            // Return signed transactions (as base64 serialized)
            resolve(result.signedTransactions || []);
          }
        }
      };

      const handleTxError = (event: CustomEvent) => {
        const eventName = request.method === 'signAndSendTransactions' 
          ? 'mwaSignAndSendTransactionsResult' 
          : 'mwaSignTransactionsResult';
        
        window.removeEventListener(eventName, handleTxResult as EventListener);
        window.removeEventListener('mwaError', handleTxError as EventListener);
        reject(new Error(event.detail.error || `${request.method} failed`));
      };

      const eventName = request.method === 'signAndSendTransactions' 
        ? 'mwaSignAndSendTransactionsResult' 
        : 'mwaSignTransactionsResult';

      window.addEventListener(eventName, handleTxResult as EventListener);
      window.addEventListener('mwaError', handleTxError as EventListener);

      // Convert transactions to base64
      const transactionsBase64 = transactions.map((tx: any) => {
        // If it's a Transaction object, serialize it
        if (tx instanceof Uint8Array) {
          return btoa(String.fromCharCode(...tx));
        } else if (tx.serialize) {
          return btoa(String.fromCharCode(...tx.serialize()));
        } else {
          return btoa(String.fromCharCode(...new Uint8Array(tx)));
        }
      });

      const methodName = request.method === 'signAndSendTransactions'
        ? 'mwaSignAndSendTransactions'
        : 'mwaSignTransactions';

      if (typeof (window as any).Android?.[methodName] === 'function') {
        (window as any).Android[methodName](JSON.stringify(transactionsBase64));
      } else {
        reject(new Error(`${request.method} not supported by Android bridge`));
      }
    } else if (request.method === 'deauthorize') {
      // Handle deauthorize
      const { auth_token } = request.params || {};
      
      if (typeof (window as any).Android?.mwaDeauthorize === 'function') {
        (window as any).Android.mwaDeauthorize(auth_token);
        resolve({});
      } else {
        resolve({}); // Silently succeed if not supported
      }
    } else if (request.method === 'getCapabilities') {
      // Return default capabilities
      resolve({
        max_transactions_per_request: 10,
        max_messages_per_request: 10,
        supported_transaction_versions: ['legacy', 0],
        features: [],
      });
    } else {
      reject(new Error(`Unsupported MWA method: ${request.method}`));
    }
  }
}

// Create singleton transport
let transportInstance: AndroidWebViewTransport | null = null;

function getTransport(): AndroidWebViewTransport {
  if (!transportInstance) {
    transportInstance = new AndroidWebViewTransport();
  }
  return transportInstance;
}

/**
 * Check if MWA is available via Android bridge
 */
export function isMWAAvailable(): boolean {
  return typeof (window as any).Android !== 'undefined' &&
         (typeof (window as any).Android?.mwaTransact === 'function' ||
          typeof (window as any).Android?.mwaAuthorize === 'function');
}

/**
 * Create a transact function compatible with official MWA library
 * but using our Android WebView bridge
 */
export async function transactWithAndroid<T>(
  callback: (wallet: Web3MobileWallet) => Promise<T>
): Promise<T> {
  if (!isMWAAvailable()) {
    throw new Error('Mobile Wallet Adapter not available on this device');
  }

  const transport = getTransport();
  await transport.connect();

  try {
    // Create a Web3MobileWallet instance that uses our transport
    // Note: Official library expects certain transport interface
    // We'll need to adapt the official library or use it differently
    
    // For now, we'll create a compatible wallet interface
    const wallet = createAndroidWebViewWallet(transport);
    
    // Execute callback with wallet
    const result = await callback(wallet);
    return result;
  } finally {
    await transport.disconnect();
  }
}

/**
 * Create a wallet interface compatible with Web3MobileWallet
 * but using Android WebView bridge
 */
function createAndroidWebViewWallet(transport: AndroidWebViewTransport): Web3MobileWallet {
  return {
    authorize: async (params: any) => {
      const result = await transport.send({
        method: 'authorize',
        params: {
          chain: params.chain,
          identity: params.identity,
          sign_in_payload: params.sign_in_payload,
          auth_token: params.auth_token,
        },
      });

      return result;
    },

    deauthorize: async (params: { auth_token: string }) => {
      // Implement deauthorize via Android bridge
      return await transport.send({
        method: 'deauthorize',
        params,
      });
    },

    getCapabilities: async () => {
      return await transport.send({
        method: 'getCapabilities',
        params: {},
      });
    },

    signTransactions: async (params: any) => {
      return await transport.send({
        method: 'signTransactions',
        params,
      });
    },

    signAndSendTransactions: async (params: any) => {
      return await transport.send({
        method: 'signAndSendTransactions',
        params,
      });
    },

    signMessages: async (params: { addresses: string[]; payloads: Uint8Array[] }) => {
      return await transport.send({
        method: 'signMessages',
        params: {
          addresses: params.addresses,
          payloads: params.payloads,
        },
      });
    },
  } as Web3MobileWallet;
}

// Re-export types from official library
export type { Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";

