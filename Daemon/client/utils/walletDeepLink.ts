// Deep linking utilities untuk membuka wallet APK
export interface WalletApp {
  name: string;
  packageName: string;
  deepLink: string;
  fallbackUrl: string;
}

// Daftar wallet APK yang didukung
export const SUPPORTED_WALLETS: WalletApp[] = [
  {
    name: 'Phantom',
    packageName: 'app.phantom',
    deepLink: 'phantom://v1/connect',
    fallbackUrl: 'https://phantom.app/download'
  },
  {
    name: 'Solflare',
    packageName: 'com.solflare.mobile',
    // Solflare mobile deep link format for connection/sign-in
    // Use connect endpoint to trigger wallet connection flow
    deepLink: 'solflare://connect',
    fallbackUrl: 'https://solflare.com/download'
  },
  {
    name: 'Backpack',
    packageName: 'com.backpack.app',
    deepLink: 'backpack://connect',
    fallbackUrl: 'https://backpack.app/download'
  },
  {
    name: 'Trust Wallet',
    packageName: 'com.wallet.crypto.trustapp',
    deepLink: 'trust://open_url?url=',
    fallbackUrl: 'https://trustwallet.com/download'
  }
];

// Fungsi untuk membuka wallet APK
export const openWalletApp = async (wallet: WalletApp, message?: string): Promise<boolean> => {
  try {
    // Construct deep link URL dengan format yang benar untuk setiap wallet
    let deepLinkUrl = wallet.deepLink;
    
    if (wallet.name === 'Solflare') {
      // Solflare mobile memerlukan format khusus untuk trigger sign-in
      // Format: solflare://connect dengan query parameters untuk dApp dan callback
      const appUri = typeof window !== 'undefined' ? window.location.origin : 'https://daemonprotocol.com';
      const redirectUri = 'daemon-seeker://wallet-connected';
      const dappName = 'Daemon Seeker';
      
      deepLinkUrl = `solflare://connect?uri=${encodeURIComponent(appUri)}&redirect=${encodeURIComponent(redirectUri)}&dapp=${encodeURIComponent(dappName)}`;
      
      // Add action untuk explicitly request sign-in/connect
      deepLinkUrl += '&action=connect';
      
      if (message) {
        deepLinkUrl += `&message=${encodeURIComponent(message)}`;
      }
      
      console.log('Solflare deep link for connect/sign-in:', deepLinkUrl);
    } else if (wallet.name === 'Phantom') {
      // Phantom format sudah benar, bisa tambahkan params jika perlu
      if (message) {
        deepLinkUrl = `${wallet.deepLink}?message=${encodeURIComponent(message)}`;
      }
    } else {
      // Untuk wallet lain, gunakan message parameter jika ada
      deepLinkUrl = message ? `${wallet.deepLink}?message=${encodeURIComponent(message)}` : wallet.deepLink;
    }
    
    console.log(`Opening ${wallet.name} with deep link:`, deepLinkUrl);
    
    // Check if running in Android WebView (Capacitor or file://)
    const isAndroidWebView = isMobileDevice() && 
      (window.location.protocol === 'file:' || 
       window.location.protocol === 'capacitor:' ||
       (window as any).Android !== undefined);
    
    if (isAndroidWebView) {
      // Use Android JavaScript interface if available (preferred method)
      if ((window as any).Android && typeof (window as any).Android.openWalletApp === 'function') {
        console.log('Using Android interface to open:', deepLinkUrl);
        (window as any).Android.openWalletApp(deepLinkUrl);
        return true;
      }
      
      // Fallback method 1: Create anchor and click (works in WebView)
      console.log('Using anchor method to open:', deepLinkUrl);
      const link = document.createElement('a');
      link.href = deepLinkUrl;
      link.style.display = 'none';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      // Fallback method 2: Try window.location
      setTimeout(() => {
        try {
          console.log('Trying window.location.href fallback');
          (window.location as any).href = deepLinkUrl;
        } catch (e) {
          console.error('Failed to open wallet via location:', e);
        }
      }, 200);
      
      return true;
    } else {
      // Untuk desktop atau mobile browser, gunakan window.open
      window.open(deepLinkUrl, '_blank');
      return true;
    }
  } catch (error) {
    console.error(`Failed to open ${wallet.name}:`, error);
    return false;
  }
};

// Fungsi untuk deteksi device mobile
export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

// Fungsi untuk deteksi apakah aplikasi berjalan di Capacitor
export const isCapacitorApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
};

// Fungsi untuk membuka Phantom APK
export const openPhantomApp = async (message?: string): Promise<boolean> => {
  const phantom = SUPPORTED_WALLETS.find(w => w.name === 'Phantom');
  if (!phantom) return false;
  
  return await openWalletApp(phantom, message);
};

// Fungsi untuk membuka Solflare APK
export const openSolflareApp = async (message?: string): Promise<boolean> => {
  const solflare = SUPPORTED_WALLETS.find(w => w.name === 'Solflare');
  if (!solflare) return false;
  
  return await openWalletApp(solflare, message);
};

// Fungsi untuk membuka Backpack APK
export const openBackpackApp = async (message?: string): Promise<boolean> => {
  const backpack = SUPPORTED_WALLETS.find(w => w.name === 'Backpack');
  if (!backpack) return false;
  
  return await openWalletApp(backpack, message);
};

// Fungsi untuk menampilkan daftar wallet yang tersedia
export const getAvailableWallets = (): WalletApp[] => {
  return SUPPORTED_WALLETS;
};

// Fungsi untuk membuka wallet dengan nama
export const openWalletByName = async (walletName: string, message?: string): Promise<boolean> => {
  const wallet = SUPPORTED_WALLETS.find(w => w.name.toLowerCase() === walletName.toLowerCase());
  if (!wallet) {
    console.error(`Wallet ${walletName} not found`);
    return false;
  }
  
  return await openWalletApp(wallet, message);
};
