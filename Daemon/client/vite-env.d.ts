/// <reference types="vite/client" />

interface PhantomPublicKeyLike {
  toBase58(): string;
}

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey?: PhantomPublicKeyLike | string }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
  publicKey?: PhantomPublicKeyLike;
}

interface Window {
  solana?: PhantomProvider;
}
