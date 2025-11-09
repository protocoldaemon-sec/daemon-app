/**
 * Performance optimization utilities
 * Helps with lazy loading, preloading, and performance monitoring
 */

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Map<string, number> = new Map();

  static startMeasure(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
    }
    this.metrics.set(name, Date.now());
  }

  static endMeasure(name: string): number {
    const startTime = this.metrics.get(name);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.metrics.delete(name);

    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    console.debug(`⏱️ ${name}: ${duration}ms`);
    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    return fn().finally(() => this.endMeasure(name));
  }
}

// Resource preloading utilities
export class ResourcePreloader {
  private static preloadedImages = new Set<string>();
  private static preloadedScripts = new Set<string>();

  static preloadImage(src: string): Promise<void> {
    if (this.preloadedImages.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedImages.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  static preloadScript(src: string): Promise<void> {
    if (this.preloadedScripts.has(src)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.onload = () => {
        this.preloadedScripts.add(src);
        resolve();
      };
      script.onerror = reject;
      script.src = src;
      document.head.appendChild(script);
    });
  }

  static preloadFont(fontFamily: string, src: string): Promise<void> {
    return new Promise((resolve) => {
      const font = new FontFace(fontFamily, `url(${src})`);
      font.load().then(() => {
        document.fonts.add(font);
        resolve();
      });
    });
  }
}

// Dynamic imports with caching and error handling
export class DynamicImports {
  private static cache = new Map<string, Promise<any>>();

  static async importWithCache<T>(
    key: string,
    importFn: () => Promise<T>,
    retries = 2
  ): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const importPromise = this.executeImport(importFn, retries);
    this.cache.set(key, importPromise);
    return importPromise;
  }

  private static async executeImport<T>(
    importFn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    try {
      return await importFn();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Import failed, retrying... (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.executeImport(importFn, retries - 1);
      }
      throw error;
    }
  }

  static preloadSeedVault() {
    return this.importWithCache(
      'seed-vault',
      () => import('../lib/seed-vault-sdk')
    );
  }

  static preloadMobileWallet() {
    return this.importWithCache(
      'mobile-wallet',
      () => import('../utils/mobileWalletAdapter')
    );
  }

  static preloadCharts() {
    return this.importWithCache(
      'charts',
      () => import('recharts')
    );
  }

  static preload3D() {
    return this.importWithCache(
      'three',
      () => import('three')
    );
  }
}

// Intersection Observer for lazy loading
export class LazyLoader {
  private static observer: IntersectionObserver | null = null;

  static initObserver(): IntersectionObserver {
    if (this.observer) return this.observer;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const loader = element.dataset.lazyLoader;

            if (loader) {
              this.loadComponent(loader, element);
              this.observer?.unobserve(element);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before element comes into view
        threshold: 0.1,
      }
    );

    return this.observer;
  }

  private static async loadComponent(loader: string, element: HTMLElement) {
    try {
      PerformanceMonitor.startMeasure(`lazy-load-${loader}`);

      let component;
      switch (loader) {
        case 'seed-vault':
          const { SeedVaultDemo } = await import('../components/SeedVaultDemo');
          component = SeedVaultDemo;
          break;
        case 'wallet-modal':
          const { EnhancedWalletConnectionModal } = await import('../components/EnhancedWalletConnectionModal');
          component = EnhancedWalletConnectionModal;
          break;
        case 'cyclops':
          const { Cyclops } = await import('../components/Cyclops');
          component = Cyclops;
          break;
        default:
          throw new Error(`Unknown loader: ${loader}`);
      }

      // Replace the placeholder with the actual component
      // This would need to be implemented based on your framework
      console.log(`✅ Loaded component: ${loader}`);

      PerformanceMonitor.endMeasure(`lazy-load-${loader}`);
    } catch (error) {
      console.error(`❌ Failed to load component: ${loader}`, error);
    }
  }

  static observe(element: HTMLElement, loader: string) {
    element.dataset.lazyLoader = loader;
    this.initObserver().observe(element);
  }

  static disconnect() {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// Memory management utilities
export class MemoryManager {
  private static cleanupTasks: (() => void)[] = [];

  static addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  static cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }

  static monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }
  }

  static forceGarbageCollection(): void {
    if ('gc' in window) {
      (window as any).gc();
    }
  }
}

// Network utilities for performance
export class NetworkOptimizer {
  static async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (retries > 0) {
        console.warn(`Fetch failed, retrying... (${retries} attempts left)`, error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  static preloadCriticalResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;

      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        link.as = 'image';
      }

      document.head.appendChild(link);
    });
  }
}

// Initialize performance monitoring on app load
if (typeof window !== 'undefined') {
  // Monitor page load performance
  window.addEventListener('load', () => {
    if ('navigation' in performance) {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      console.log('Page load performance:', {
        domContentLoaded: `${navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart}ms`,
        loadComplete: `${navEntry.loadEventEnd - navEntry.loadEventStart}ms`,
        totalTime: `${navEntry.loadEventEnd - navEntry.fetchStart}ms`,
      });
    }

    MemoryManager.monitorMemoryUsage();
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    LazyLoader.disconnect();
    MemoryManager.cleanup();
  });
}