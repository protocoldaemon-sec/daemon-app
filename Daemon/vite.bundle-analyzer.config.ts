/**
 * Bundle Analyzer Configuration
 * Configuration for analyzing bundle size and dependencies
 */

import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export const bundleAnalyzerConfig = {
  plugins: [
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      // Generate JSON for programmatic analysis
      json: true,
      // Include only client bundles (exclude server)
      exclude: [/node_modules\/server/],
    }),
  ],
  build: {
    // Generate manifest for bundle analysis
    manifest: true,
  },
};