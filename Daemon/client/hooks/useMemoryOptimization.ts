import { useCallback, useEffect, useRef, useState } from 'react';

interface MemoryOptimizationOptions {
  maxRetainedItems?: number;
  enableVirtualization?: boolean;
  debounceTime?: number;
  cleanupInterval?: number;
}

/**
 * Custom hook for memory optimization on 8GB RAM Android devices
 * Optimized for 2670x1200 AMOLED displays with 120Hz refresh rate
 */
export function useMemoryOptimization(options: MemoryOptimizationOptions = {}) {
  const {
    maxRetainedItems = 50,
    enableVirtualization = true,
    debounceTime = 100,
    cleanupInterval = 30000 // 30 seconds
  } = options;

  const [isLowMemory, setIsLowMemory] = useState(false);
  const retainedItems = useRef<Map<string, any>>(new Map());
  const cleanupTimer = useRef<NodeJS.Timeout>();
  const lastCleanup = useRef(Date.now());

  // Check if device is low on memory
  const checkMemoryStatus = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedJSHeapSize = memory?.usedJSHeapSize || 0;
      const totalJSHeapSize = memory?.totalJSHeapSize || 0;
      const jsHeapSizeLimit = memory?.jsHeapSizeLimit || 0;

      // Consider low memory if using more than 70% of available heap
      const memoryUsageRatio = usedJSHeapSize / jsHeapSizeLimit;
      setIsLowMemory(memoryUsageRatio > 0.7);

      return {
        used: usedJSHeapSize,
        total: totalJSHeapSize,
        limit: jsHeapSizeLimit,
        usageRatio: memoryUsageRatio
      };
    }
    return null;
  }, []);

  // Cleanup old items to prevent memory leaks
  const cleanup = useCallback(() => {
    const now = Date.now();
    if (now - lastCleanup.current < cleanupInterval) return;

    const items = retainedItems.current;
    if (items.size > maxRetainedItems) {
      // Remove oldest items beyond the limit
      const entries = Array.from(items.entries());
      const toRemove = entries.slice(0, entries.length - maxRetainedItems);
      toRemove.forEach(([key]) => items.delete(key));
    }

    lastCleanup.current = now;
    checkMemoryStatus();
  }, [maxRetainedItems, cleanupInterval, checkMemoryStatus]);

  // Store item with memory management
  const retainItem = useCallback((key: string, item: any) => {
    if (!enableVirtualization) return;

    retainedItems.current.set(key, {
      item,
      timestamp: Date.now()
    });

    cleanup();
  }, [enableVirtualization, cleanup]);

  // Get retained item
  const getRetainedItem = useCallback((key: string) => {
    const retained = retainedItems.current.get(key);
    return retained?.item;
  }, []);

  // Release specific item
  const releaseItem = useCallback((key: string) => {
    retainedItems.current.delete(key);
  }, []);

  // Debounced function for memory-intensive operations
  const useDebouncedCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = debounceTime
  ) => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  }, [debounceTime]);

  // Optimized scroll handler
  const useOptimizedScroll = useCallback((callback: () => void) => {
    return useDebouncedCallback(callback, isLowMemory ? 150 : 50);
  }, [useDebouncedCallback, isLowMemory]);

  // Memory-optimized image loader
  const useOptimizedImage = useCallback((src: string) => {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      if (!src) return;

      const img = new Image();
      imgRef.current = img;

      // Optimize for 6.36" AMOLED display
      img.decoding = 'async';
      img.loading = 'lazy';

      img.onload = () => {
        setIsLoaded(true);
      };

      img.onerror = () => {
        console.warn('Failed to load optimized image:', src);
      };

      img.src = src;

      return () => {
        // Cleanup on unmount
        if (imgRef.current) {
          imgRef.current.src = '';
          imgRef.current.onload = null;
          imgRef.current.onerror = null;
        }
      };
    }, [src]);

    return { isLoaded, imgRef };
  }, []);

  // Setup memory monitoring and cleanup
  useEffect(() => {
    // Initial memory check
    checkMemoryStatus();

    // Setup periodic cleanup
    if (enableVirtualization) {
      cleanupTimer.current = setInterval(cleanup, cleanupInterval);
    }

    // Listen for memory pressure events (if available)
    const handleMemoryPressure = () => {
      setIsLowMemory(true);
      cleanup(); // Immediate cleanup on memory pressure
    };

    // Add memory pressure listener for Android
    if ('onmemorypressure' in window) {
      (window as any).onmemorypressure = handleMemoryPressure;
    }

    return () => {
      if (cleanupTimer.current) {
        clearInterval(cleanupTimer.current);
      }

      // Clear all retained items
      retainedItems.current.clear();

      // Remove memory pressure listener
      if ('onmemorypressure' in window) {
        (window as any).onmemorypressure = null;
      }
    };
  }, [checkMemoryStatus, cleanup, enableVirtualization, cleanupInterval]);

  return {
    isLowMemory,
    retainItem,
    getRetainedItem,
    releaseItem,
    useDebouncedCallback,
    useOptimizedScroll,
    useOptimizedImage,
    memoryStatus: checkMemoryStatus(),
    cleanup
  };
}

// Utility function for 120Hz optimized animations
export function get120HzOptimizedDuration(baseDuration: number, isLowMemory: boolean): number {
  // On 120Hz displays, we can use faster animations
  // But reduce duration if low memory detected
  const optimizedDuration = isLowMemory ? baseDuration * 0.6 : baseDuration * 0.8;
  return Math.max(100, optimizedDuration); // Minimum 100ms
}

// Utility for AMOLED display optimization
export function getAMOLEDOptimizedColor(theme: 'light' | 'dark', opacity: number = 1): string {
  if (theme === 'dark') {
    // Use true black for AMOLED displays to save power
    return `rgba(0, 0, 0, ${opacity})`;
  }
  return `rgba(255, 255, 255, ${opacity})`;
}