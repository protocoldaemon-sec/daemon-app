/**
 * Lazy-loaded components for code splitting
 * These components will be loaded on-demand to reduce initial bundle size
 */

import { lazy } from 'react';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8 min-h-[200px]">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  </div>
);

// Lazy loaded heavy components
export const LazySeedVaultDemo = lazy(() =>
  import('./SeedVaultDemo').then(module => ({
    default: module.SeedVaultDemo
  }))
);

export const LazyEnhancedWalletConnectionModal = lazy(() =>
  import('./EnhancedWalletConnectionModal').then(module => ({
    default: module.EnhancedWalletConnectionModal
  }))
);

export const LazyCyclops = lazy(() =>
  import('./Cyclops').then(module => ({
    default: module.Cyclops
  }))
);

export const LazyAnimatedRoutes = lazy(() =>
  import('./AnimatedRoutes').then(module => ({
    default: module.AnimatedRoutes
  }))
);

// HOC for lazy loading with suspense
export function withLazyLoading<T extends object>(
  Component: React.LazyExoticComponent<React.ComponentType<T>>,
  fallbackMessage?: string
) {
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={<LoadingFallback message={fallbackMessage} />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Pre-configured lazy components with loading states
export const LazySeedVaultDemoWithLoading = withLazyLoading(LazySeedVaultDemo, "Loading Seed Vault Demo...");
export const LazyWalletModalWithLoading = withLazyLoading(LazyEnhancedWalletConnectionModal, "Loading Wallet Connection...");
export const LazyCyclopsWithLoading = withLazyLoading(LazyCyclops, "Loading 3D Visualization...");
export const LazyAnimatedRoutesWithLoading = withLazyLoading(LazyAnimatedRoutes, "Loading Routes...");

// Dynamic imports for utilities (for when needed)
export const loadSeedVaultUtils = () => import('../lib/seed-vault-sdk');
export const loadChartUtils = () => import('recharts');
export const loadThreeJS = () => import('three');
export const loadMobileWalletUtils = () => import('../utils/mobileWalletAdapter');

// Prefetch utilities for better UX
export const prefetchSeedVault = () => {
  // This will start loading the module in the background
  import('../lib/seed-vault-sdk');
};

export const prefetchWalletAdapter = () => {
  import('../utils/mobileWalletAdapter');
};

export const prefetchCharts = () => {
  import('recharts');
};

export const prefetch3D = () => {
  import('three');
};