// Mobile Wallet Adapter (MWA) wrapper for web app
// This adapts MWA protocol for use in WebView Android app

export interface AppIdentity {
  name: string;
  uri: string;
  icon?: string;
}

import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features";

export interface AuthorizationResult {
  accounts: Array<{
    address: string;
    label?: string;
    publicKey?: Uint8Array;
  }>;
  auth_token?: string;
  wallet_uri_base?: string;
  sign_in_result?: SolanaSignInOutput; // For SIWS (Sign In With Solana)
}

export interface MWAConnectionOptions {
  cluster?: string;
  identity: AppIdentity;
  auth_token?: string;
  signInInput?: SolanaSignInInput; // For Sign In With Solana (SIWS)
}

/**
 * Mobile Wallet Adapter wrapper
 * Uses native Android bridge to communicate with MWA-compliant wallets
 */
export class MobileWalletAdapter {
  private static instance: MobileWalletAdapter;
  private authToken: string | null = null;
  private authorizedAccounts: AuthorizationResult | null = null;

  static getInstance(): MobileWalletAdapter {
    if (!MobileWalletAdapter.instance) {
      MobileWalletAdapter.instance = new MobileWalletAdapter();
    }
    return MobileWalletAdapter.instance;
  }

  /**
   * Check if MWA is available (native Android interface)
   */
  isAvailable(): boolean {
    return typeof (window as any).Android !== 'undefined' && 
           typeof (window as any).Android?.mwaAuthorize === 'function';
  }

  /**
   * Authorize connection to wallet via MWA
   */
  async authorize(options: MWAConnectionOptions): Promise<AuthorizationResult> {
    if (!this.isAvailable()) {
      throw new Error('Mobile Wallet Adapter not available. This feature requires Android native support.');
    }

    return new Promise((resolve, reject) => {
      try {
        const identityJson = JSON.stringify(options.identity);
        const cluster = options.cluster || 'solana:mainnet-beta';
        const signInInputJson = options.signInInput ? JSON.stringify(options.signInInput) : null;
        
        // Set up callback listener
        const handleMWAResult = (event: CustomEvent) => {
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);
          
          const result = event.detail;
          if (result.error) {
            reject(new Error(result.error));
          } else {
            this.authorizedAccounts = result;
            this.authToken = result.auth_token || null;
            resolve(result);
          }
        };

        const handleMWAError = (event: CustomEvent) => {
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);
          reject(new Error(event.detail.error || 'Authorization failed'));
        };

        window.addEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
        window.addEventListener('mwaError', handleMWAError as EventListener);

        // Add visibility change listener to detect when user returns from wallet app
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log('App visible again, checking for MWA result...');
            // Give a moment for onActivityResult to fire
            setTimeout(() => {
              // Check if result was received
              if (document.visibilityState === 'visible') {
                console.log('Still visible, MWA might have completed');
              }
            }, 1000);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Call native Android MWA interface
        // If signInInput is provided, pass it for SIWS
        console.log('Calling Android.mwaAuthorize with:', { identityJson, cluster, hasSignInInput: !!signInInputJson });
        if (signInInputJson && typeof (window as any).Android.mwaAuthorizeWithSIWS === 'function') {
          // Use SIWS method if available
          (window as any).Android.mwaAuthorizeWithSIWS(identityJson, cluster, signInInputJson);
        } else {
          // Regular authorization
          (window as any).Android.mwaAuthorize(identityJson, cluster);
        }

        // Timeout after 30 seconds
        const timeoutId = setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
          window.removeEventListener('mwaError', handleMWAError as EventListener);
          reject(new Error('Authorization timeout'));
        }, 30000);

        // Cleanup timeout on success
        const originalHandleMWAResult = handleMWAResult;
        const newHandleMWAResult = (event: CustomEvent) => {
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          originalHandleMWAResult(event);
        };

        const originalHandleMWAError = handleMWAError;
        const newHandleMWAError = (event: CustomEvent) => {
          clearTimeout(timeoutId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          originalHandleMWAError(event);
        };

        // Replace handlers
        window.removeEventListener('mwaAuthorizationResult', handleMWAResult as EventListener);
        window.removeEventListener('mwaError', handleMWAError as EventListener);
        window.addEventListener('mwaAuthorizationResult', newHandleMWAResult as EventListener);
        window.addEventListener('mwaError', newHandleMWAError as EventListener);

      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Sign message via MWA
   */
  async signMessage(message: Uint8Array, address?: string): Promise<Uint8Array> {
    if (!this.isAvailable()) {
      throw new Error('Mobile Wallet Adapter not available');
    }

    if (!this.authorizedAccounts || !this.authorizedAccounts.accounts[0]) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    return new Promise((resolve, reject) => {
      try {
        const messageBase64 = btoa(String.fromCharCode(...message));
        const targetAddress = address || this.authorizedAccounts!.accounts[0].address;

        const handleSignResult = (event: CustomEvent) => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);
          
          const result = event.detail;
          if (result.error) {
            reject(new Error(result.error));
          } else {
            // Convert base64 signature to Uint8Array
            const signatureBase64 = result.signature;
            const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
            resolve(signatureBytes);
          }
        };

        const handleSignError = (event: CustomEvent) => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);
          reject(new Error(event.detail.error || 'Sign message failed'));
        };

        window.addEventListener('mwaSignResult', handleSignResult as EventListener);
        window.addEventListener('mwaError', handleSignError as EventListener);

        (window as any).Android.mwaSignMessage(messageBase64, targetAddress);

        setTimeout(() => {
          window.removeEventListener('mwaSignResult', handleSignResult as EventListener);
          window.removeEventListener('mwaError', handleSignError as EventListener);
          reject(new Error('Sign message timeout'));
        }, 30000);

      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Deauthorize wallet connection
   */
  async deauthorize(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    if (this.authToken) {
      try {
        (window as any).Android.mwaDeauthorize(this.authToken);
        this.authToken = null;
        this.authorizedAccounts = null;
      } catch (error) {
        console.error('Deauthorization error:', error);
      }
    }
  }

  /**
   * Get authorized accounts
   */
  getAuthorizedAccounts(): AuthorizationResult | null {
    return this.authorizedAccounts;
  }

  /**
   * Check if wallet is authorized
   */
  isAuthorized(): boolean {
    return this.authorizedAccounts !== null && 
           this.authorizedAccounts.accounts.length > 0;
  }
}

// Export singleton instance
export const mwa = MobileWalletAdapter.getInstance();

// Default app identity
export const DEFAULT_APP_IDENTITY: AppIdentity = {
  name: 'Daemon Seeker App',
  uri: 'https://daemonprotocol.com',
  icon: './favicon.svg',
};

