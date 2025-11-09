// Helper function untuk Solflare connection
export const connectToSolflare = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 30000); // 30 second timeout

    try {
      if (!window.solflare?.isSolflare) {
        clearTimeout(timeout);
        reject(new Error('Solflare wallet not found. Please install Solflare extension.'));
        return;
      }

      console.log('Starting Solflare connection...');
      
      // Method 1: Try direct connection
      window.solflare.connect()
        .then((response: any) => {
          console.log('Solflare connect response:', response);
          
          // Wait for connection to be established
          setTimeout(() => {
            try {
              let publicKey: string;
              
              // Try different ways to get public key
              if (response?.publicKey) {
                publicKey = typeof response.publicKey === 'string' 
                  ? response.publicKey 
                  : response.publicKey.toString();
              } else if (window.solflare?.publicKey) {
                publicKey = typeof window.solflare.publicKey === 'string'
                  ? window.solflare.publicKey
                  : window.solflare.publicKey.toString();
              } else {
                clearTimeout(timeout);
                reject(new Error('No public key received from Solflare'));
                return;
              }
              
              console.log('Successfully connected to Solflare:', publicKey);
              clearTimeout(timeout);
              resolve(publicKey);
              
            } catch (err: any) {
              console.error('Error processing Solflare response:', err);
              clearTimeout(timeout);
              reject(err);
            }
          }, 2000); // Wait 2 seconds for connection to establish
        })
        .catch((error: any) => {
          console.error('Solflare connection error:', error);
          clearTimeout(timeout);
          reject(error);
        });

    } catch (error: any) {
      console.error('Solflare setup error:', error);
      clearTimeout(timeout);
      reject(error);
    }
  });
};

// Alternative method using event listeners
export const connectToSolflareWithEvents = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 30000);

    try {
      if (!window.solflare?.isSolflare) {
        clearTimeout(timeout);
        reject(new Error('Solflare wallet not found. Please install Solflare extension.'));
        return;
      }

      // Listen for account change events
      const handleAccountChange = (publicKey: any) => {
        console.log('Account changed:', publicKey);
        if (publicKey) {
          const address = typeof publicKey === 'string' ? publicKey : publicKey.toString();
          clearTimeout(timeout);
          resolve(address);
        }
      };

      // Listen for connect events
      const handleConnect = (publicKey: any) => {
        console.log('Connected:', publicKey);
        if (publicKey) {
          const address = typeof publicKey === 'string' ? publicKey : publicKey.toString();
          clearTimeout(timeout);
          resolve(address);
        }
      };

      // Add event listeners
      window.addEventListener('solflare#accountChanged', handleAccountChange);
      window.addEventListener('solflare#connect', handleConnect);

      // Initiate connection
      window.solflare.connect().catch((error: any) => {
        console.error('Solflare connection failed:', error);
        window.removeEventListener('solflare#accountChanged', handleAccountChange);
        window.removeEventListener('solflare#connect', handleConnect);
        clearTimeout(timeout);
        reject(error);
      });

      // Cleanup function
      const cleanup = () => {
        window.removeEventListener('solflare#accountChanged', handleAccountChange);
        window.removeEventListener('solflare#connect', handleConnect);
      };

      // Set timeout cleanup
      setTimeout(cleanup, 30000);

    } catch (error: any) {
      console.error('Solflare event setup error:', error);
      clearTimeout(timeout);
      reject(error);
    }
  });
};

// Declare global types
declare global {
  interface Window {
    solflare?: {
      isSolflare: boolean;
      connect: () => Promise<any>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{
        signature: Uint8Array;
      }>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      publicKey: any;
      isConnected: boolean;
    };
  }
}
