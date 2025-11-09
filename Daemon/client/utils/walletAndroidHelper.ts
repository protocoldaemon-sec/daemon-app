// Helper untuk handle wallet connection di Android WebView
import { WalletApp } from './walletDeepLink';

// Listen untuk wallet callback dari Android
export const setupWalletCallbackListener = (
  onWalletConnected: (walletType: string, publicKey?: string) => void,
  onWalletError: (error: string) => void
) => {
  // Listen untuk custom event dari MainActivity
  const handleWalletCallback = (event: CustomEvent) => {
    const url = event.detail?.url;
    if (!url) return;
    
    console.log('Wallet callback received:', url);
    
    // Parse wallet type dari URL
    let walletType = '';
    if (url.startsWith('phantom://')) {
      walletType = 'phantom';
    } else if (url.startsWith('solflare://')) {
      walletType = 'solflare';
    } else if (url.startsWith('backpack://')) {
      walletType = 'backpack';
    }
    
    if (walletType) {
      // Extract public key jika ada di URL
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const publicKey = urlParams.get('publicKey') || urlParams.get('address') || urlParams.get('pubkey');
      
      // Check if there's connection data in the URL
      const connected = urlParams.get('connected') === 'true' || url.includes('connected');
      const error = urlParams.get('error');
      
      if (error) {
        onWalletError(error);
      } else if (publicKey) {
        onWalletConnected(walletType, publicKey);
      } else if (connected) {
        // Wallet connected but no public key yet - might be pending approval
        // Try to get from wallet app storage or prompt user
        console.log(`${walletType} callback received but no public key. Connection might be pending.`);
        // Dispatch event for manual handling
        window.dispatchEvent(new CustomEvent('walletPending', {
          detail: { walletType, url }
        }));
      } else {
        // Callback received but unclear status
        console.log('Wallet callback received but status unclear:', url);
        // Try to extract any connection info
        const message = urlParams.get('message');
        if (message && message.toLowerCase().includes('connect')) {
          // Connection initiated, wait for approval
          console.log('Connection initiated, waiting for approval...');
        }
      }
    }
  };
  
  window.addEventListener('walletCallback' as any, handleWalletCallback as EventListener);
  
  // Cleanup function
  return () => {
    window.removeEventListener('walletCallback' as any, handleWalletCallback as EventListener);
  };
};

// Check jika Android interface tersedia
export const isAndroidInterfaceAvailable = (): boolean => {
  return typeof (window as any).Android !== 'undefined' && 
         typeof (window as any).Android.openWalletApp === 'function';
};

// Simulate wallet connection untuk testing
export const simulateWalletConnection = (walletType: 'phantom' | 'solflare' | 'backpack') => {
  // Hanya untuk testing di Android - simulasikan connection sukses
  const mockPublicKey = 'Test' + walletType + Math.random().toString(36).substring(7);
  
  window.dispatchEvent(new CustomEvent('walletConnected', {
    detail: {
      type: walletType,
      address: mockPublicKey
    }
  }));
  
  return mockPublicKey;
};

