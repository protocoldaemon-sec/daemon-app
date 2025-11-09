// Manual wallet connection helper
// For wallets that don't support automatic callbacks (like Solflare)
// User needs to approve in wallet app, then we detect connection via polling

export interface ManualConnectionState {
  isWaiting: boolean;
  walletType: string | null;
  startTime: number;
  checkInterval: NodeJS.Timeout | null;
  timeout: NodeJS.Timeout | null;
}

let manualConnectionState: ManualConnectionState | null = null;

/**
 * Start manual connection detection
 * Polls localStorage for wallet_address to detect when user approves connection in wallet app
 */
export function startManualConnectionDetection(
  walletType: string,
  onConnected: (address: string) => void,
  onTimeout: () => void,
  timeoutMs: number = 30000
): ManualConnectionState {
  // Clear any existing state
  if (manualConnectionState) {
    stopManualConnectionDetection();
  }

  const state: ManualConnectionState = {
    isWaiting: true,
    walletType,
    startTime: Date.now(),
    checkInterval: null,
    timeout: null,
  };

  // Poll for connection dengan enhanced detection
  state.checkInterval = setInterval(() => {
    const address = localStorage.getItem('wallet_address');
    const storedWalletType = localStorage.getItem('wallet_type');
    
    // Enhanced: Check for callback URL parameters (if app was reopened via callback)
    let callbackAddress = null;
    try {
      if (typeof window !== 'undefined' && window.location) {
        const currentUrl = window.location.href;
        // Check if we're back from wallet app with callback
        if (currentUrl.includes('wallet-connected') || 
            currentUrl.includes('wallet-callback') ||
            currentUrl.includes('solflare://') ||
            currentUrl.includes('phantom://')) {
          
          // Try to extract address from URL
          const searchIndex = currentUrl.indexOf('?');
          if (searchIndex > 0) {
            const urlParams = new URLSearchParams(currentUrl.substring(searchIndex + 1));
            callbackAddress = urlParams.get('publicKey') || 
                            urlParams.get('address') || 
                            urlParams.get('pubkey') ||
                            urlParams.get('wallet_address') ||
                            urlParams.get('account');
            
            if (callbackAddress) {
              console.log('[Manual Connection] Detected wallet address from callback URL:', callbackAddress);
              // Store immediately
              localStorage.setItem('wallet_address', callbackAddress);
              localStorage.setItem('wallet_type', walletType);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Manual Connection] Error parsing callback URL:', e);
    }

    const finalAddress = address || callbackAddress;
    if (finalAddress && (storedWalletType === walletType || callbackAddress)) {
      // Connection detected!
      console.log('[Manual Connection] Connection detected! Address:', finalAddress);
      stopManualConnectionDetection();
      onConnected(finalAddress);
    }
  }, 500);

  // Set timeout
  state.timeout = setTimeout(() => {
    stopManualConnectionDetection();
    onTimeout();
  }, timeoutMs);

  // Listen for visibility changes (user returns from wallet app)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && state.isWaiting) {
      // Increase polling frequency when visible
      if (state.checkInterval) {
        clearInterval(state.checkInterval);
        state.checkInterval = setInterval(() => {
          const address = localStorage.getItem('wallet_address');
          const storedWalletType = localStorage.getItem('wallet_type');

          if (address && storedWalletType === walletType) {
            stopManualConnectionDetection();
            onConnected(address);
          }
        }, 200); // Check more frequently
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Store cleanup
  (state as any).visibilityHandler = handleVisibilityChange;

  manualConnectionState = state;
  return state;
}

/**
 * Stop manual connection detection
 */
export function stopManualConnectionDetection() {
  if (manualConnectionState) {
    if (manualConnectionState.checkInterval) {
      clearInterval(manualConnectionState.checkInterval);
    }
    if (manualConnectionState.timeout) {
      clearTimeout(manualConnectionState.timeout);
    }
    if ((manualConnectionState as any).visibilityHandler) {
      document.removeEventListener('visibilitychange', (manualConnectionState as any).visibilityHandler);
    }
    manualConnectionState = null;
  }
}

/**
 * Get current manual connection state
 */
export function getManualConnectionState(): ManualConnectionState | null {
  return manualConnectionState;
}

