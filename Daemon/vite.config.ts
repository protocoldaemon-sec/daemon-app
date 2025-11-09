import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ["react", "react-dom"],
          // UI library chunks
          ui: [
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
          ],
          // Animation library chunk
          animation: ["framer-motion", "gsap"],
          // Chart library chunk
          charts: ["recharts"],
          // Solana/wallet chunks
          solana: [
            "@solana/web3.js",
            "@solana/wallet-adapter-base",
            "@solana/wallet-adapter-react",
            "@solana-mobile/wallet-adapter-mobile",
          ],
          // Mobile wallet adapter chunk
          mwa: [
            "@solana-mobile/mobile-wallet-adapter-protocol",
            "@solana-mobile/mobile-wallet-adapter-protocol-web3js",
          ],
          // Three.js chunk
          three: ["three", "@react-three/drei", "@react-three/fiber"],
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").pop() : "chunk";
          return `js/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split(".").pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|ttf|otf/i.test(extType)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      // External dependencies for web builds
      external: (id) => {
        // React Native modules should be external for web builds
        if (id === 'react-native' || id.includes('react-native')) {
          return true;
        }
        // Don't bundle Capacitor modules for web builds
        if (id.includes("@capacitor") || id.includes("@ionic")) {
          return true;
        }
        // Don't bundle native modules
        if (id.includes('@solana-mobile/seed-vault-lib')) {
          return true;
        }
        return false;
      },
    },
    // Improve chunk size warning limit
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: isProduction,
        drop_debugger: isProduction,
        pure_funcs: isProduction ? ["console.log", "console.info"] : [],
      },
    },
  },
  plugins: [
    react(),
    expressPlugin(),
    // Bundle analyzer for production builds
    ...(isProduction
      ? [
          visualizer({
            filename: 'dist/bundle-analysis.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            json: true,
            exclude: [/node_modules\/server/],
          })
        ]
      : []
    ),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  };
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
