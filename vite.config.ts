import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import JavaScriptObfuscator from 'javascript-obfuscator';
// import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { execSync } from 'child_process';

// Get version info for build-time injection
function getVersionInfo() {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  
  // Priority: .git-commit file (Docker) > VITE_GIT_COMMIT env > git command > 'unknown'
  let gitCommit = '';
  
  // 1. Try reading from .git-commit file (created by Dockerfile)
  const gitCommitFile = path.resolve(__dirname, '.git-commit');
  if (fs.existsSync(gitCommitFile)) {
    gitCommit = fs.readFileSync(gitCommitFile, 'utf-8').trim();
  }
  
  // 2. Try env var
  if (!gitCommit) {
    gitCommit = process.env.VITE_GIT_COMMIT || '';
  }
  
  // 3. Try git command
  if (!gitCommit) {
    try {
      gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
      gitCommit = 'unknown';
    }
  }
  
  return {
    version: packageJson.version,
    commit: gitCommit,
    buildTime: new Date().toISOString(),
  };
}

// https://vitejs.dev/config/

// Custom plugin to serve Excalidraw assets in dev mode
function excalidrawAssetsPlugin() {
  return {
    name: 'excalidraw-assets',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/excalidraw-assets-dev/') || req.url?.startsWith('/excalidraw-assets/')) {
          const assetPath = req.url.startsWith('/excalidraw-assets-dev/')
            ? req.url.replace('/excalidraw-assets-dev/', '')
            : req.url.replace('/excalidraw-assets/', '');
          const folder = req.url.startsWith('/excalidraw-assets-dev/') ? 'excalidraw-assets-dev' : 'excalidraw-assets';
          const filePath = path.join(__dirname, 'node_modules/@excalidraw/excalidraw/dist', folder, assetPath);
          
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.js': 'application/javascript',
              '.woff2': 'font/woff2',
              '.woff': 'font/woff',
              '.json': 'application/json',
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

// Custom selective obfuscation plugin: only obfuscate chunks that include files under src/store/indexedDB
function cacheObfuscator(options: any) {
  return {
    name: 'whagons:cache-obfuscator',
    apply: 'build',
    enforce: 'post',
    generateBundle(_outputOptions: any, bundle: any) {
      for (const [_fileName, chunk] of Object.entries<any>(bundle)) {
        if (chunk?.type !== 'chunk' || typeof chunk.code !== 'string') continue;
        const modules = Object.keys(chunk.modules || {});
        const touchesCache = modules.some((m) => m.includes('/src/store/indexedDB/'));
        if (!touchesCache) continue;
        const result = JavaScriptObfuscator.obfuscate(chunk.code, options);
        chunk.code = result.getObfuscatedCode();
      }
    }
  } as any;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDevFlag = env.VITE_DEVELOPMENT === 'true';
  const enableHttps = env.VITE_ENABLE_HTTPS === 'true';
  const versionInfo = getVersionInfo();

  // Check if mkcert certificates exist
  const certPath = path.resolve(__dirname, 'localhost+3.pem');
  const keyPath = path.resolve(__dirname, 'localhost+3-key.pem');
  const hasMkcertCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);
  const shouldUseHttps = enableHttps && hasMkcertCerts;

  return {
    worker: {
      format: 'es',
    },
    server: {
      host: true,  // Listen on all addresses (allows access via IP)
      // Allow tenant subdomains in local dev like `tenant.localhost`
      // (prevents "Blocked request. This host is not allowed" in some Vite versions/configs)
      allowedHosts: ['.localhost', 'localhost', '127.0.0.1'],
      // Use mkcert certificates if HTTPS is explicitly enabled and certificates are available
      ...(shouldUseHttps ? {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      } : {}),
      // Serve Excalidraw assets from node_modules in dev
      fs: {
        allow: ['..'],
      },
    },
    plugins: [
      // Only use basicSsl if HTTPS is enabled, mkcert certs don't exist
      enableHttps && !hasMkcertCerts && basicSsl(),
      // Serve Excalidraw assets in dev mode
      excalidrawAssetsPlugin(),
      react(), 
      tailwindcss(),
      // Copy Excalidraw assets to dist for production builds
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@excalidraw/excalidraw/dist/excalidraw-assets/*',
            dest: 'excalidraw-assets'
          },
          {
            src: 'node_modules/@excalidraw/excalidraw/dist/excalidraw-assets-dev/*',
            dest: 'excalidraw-assets-dev'
          }
        ]
      }),
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      // Obfuscate only cache-related chunks in production (uses obfuscator.io engine)
      !isDevFlag && cacheObfuscator({
        controlFlowFlattening: true,
        stringArray: true,
        stringArrayRotate: true,
        rotateStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 6,
        numbersToExpressions: true,
        identifierNamesGenerator: 'hexadecimal',
        selfDefending: false,
        deadCodeInjection: false,
        sourceMap: false,
        compact: true
      }),
      // PWA plugin temporarily disabled for debugging
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   injectRegister: null,
      //   includeAssets: ['whagons.svg'],
      //   manifest: {
      //     name: 'WHagons',
      //     short_name: 'WHagons',
      //     start_url: '/',
      //     display: 'standalone',
      //     background_color: '#ffffff',
      //     theme_color: '#ffffff'
      //   },
      //   workbox: {
      //     // Default precaching of build assets; include large vendor chunks as well
      //     globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      //     maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      //     // Enable skipWaiting and clientsClaim for immediate updates
      //     skipWaiting: true,
      //     clientsClaim: true,
      //     // Check for updates more frequently
      //     cleanupOutdatedCaches: true,
      //     runtimeCaching: [
      //       {
      //         urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-cache',
      //           expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
      //           cacheableResponse: { statuses: [0, 200] }
      //         }
      //       }
      //     ]
      //   },
      //   devOptions: { enabled: false }
      // })
    ].filter(Boolean),
    define: {
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.IS_PREACT': JSON.stringify('false'),
      // Version info injected at build time
      __APP_VERSION__: JSON.stringify(versionInfo.version),
      __GIT_COMMIT__: JSON.stringify(versionInfo.commit),
      __BUILD_TIME__: JSON.stringify(versionInfo.buildTime),
    },
    preview: {
      allowedHosts: ['whagons5.whagons.com'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['firebase', '@firebase/app', '@firebase/messaging', '@firebase/auth', '@firebase/component'],
    },
    optimizeDeps: {
      // Exclude FontAwesome from pre-bundling to avoid circular dependency issues
      exclude: ['@fortawesome/pro-regular-svg-icons', '@fortawesome/fontawesome-common-types'],
      // Explicitly include firebase and all @firebase packages to ensure proper resolution
      include: [
        'firebase/app',
        'firebase/messaging',
        'firebase/auth',
        '@firebase/app',
        '@firebase/messaging',
        '@firebase/auth',
        '@firebase/component',
      ],
    },
    build: {
      // Enable build caching for faster rebuilds
      cacheDir: 'node_modules/.vite',
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
      // Use esbuild for faster minification (faster than terser)
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Put all firebase packages in a single chunk to avoid "Service not available" issues
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'firebase-bundle';
            }

            // Split cache/IndexedDB code into its own chunk
            if (id.includes('/src/store/indexedDB/')) return 'cache-sec';

            // Core framework
            if (id.includes('/node_modules/react-dom/')) return 'vendor';
            if (id.includes('/node_modules/react/')) return 'vendor';

            // Heavy data grid packages
            if (id.includes('/node_modules/ag-grid-community') || id.includes('/node_modules/ag-grid-enterprise')) return 'ag-grid';
            if (id.includes('/node_modules/ag-grid-react')) return 'ag-grid-react';

            // Excalidraw + its mermaid/roughjs dependencies (very heavy)
            if (id.includes('/node_modules/@excalidraw/')) return 'excalidraw';
            if (id.includes('/node_modules/mermaid') || id.includes('/node_modules/@mermaid')) return 'excalidraw';
            if (id.includes('/node_modules/roughjs/') || id.includes('/node_modules/rough/')) return 'excalidraw';

            // Charting libraries
            if (id.includes('/node_modules/echarts') || id.includes('/node_modules/echarts-for-react')) return 'echarts';
            if (id.includes('/node_modules/d3') || id.includes('/node_modules/d3-')) return 'd3';

            // Calendar
            if (id.includes('/node_modules/@fullcalendar/')) return 'fullcalendar';

            // Bryntum scheduler
            if (id.includes('/node_modules/@bryntum/')) return 'bryntum';

            // Export libs (jspdf, html2canvas, xlsx) — dynamically imported
            if (id.includes('/node_modules/jspdf/')) return 'export-libs';
            if (id.includes('/node_modules/html2canvas/')) return 'export-libs';
            if (id.includes('/node_modules/xlsx/')) return 'export-libs';

            // Router
            if (id.includes('/node_modules/react-router-dom') || id.includes('/node_modules/react-router/')) return 'router';

            // State management
            if (id.includes('/node_modules/@reduxjs/toolkit')) return 'redux';
            if (id.includes('/node_modules/react-redux')) return 'redux';
            if (id.includes('/node_modules/redux-persist')) return 'redux';

            // UI component libraries
            if (id.includes('/node_modules/@radix-ui/') || id.includes('/node_modules/radix-ui/')) return 'ui';
            if (id.includes('/node_modules/lucide-react/')) return 'ui';
            if (id.includes('/node_modules/class-variance-authority/')) return 'ui';
            if (id.includes('/node_modules/cmdk/')) return 'ui';
            if (id.includes('/node_modules/@floating-ui/')) return 'ui';

            // Markdown rendering
            const mdPkgs = ['react-markdown','remark-breaks','remark-gfm','prismjs'];
            if (mdPkgs.some(p => id.includes(`/node_modules/${p}/`))) return 'markdown';

            // Animation
            if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion/')) return 'animation';

            // HTTP
            if (id.includes('/node_modules/axios/')) return 'http';

            // Don't chunk FontAwesome separately - causes circular dependency issues
            if (id.includes('/node_modules/crypto-js')) return 'crypto';

            const utilPkgs = ['tailwind-merge','tailwindcss-animate','clsx'];
            if (utilPkgs.some(p => id.includes(`/node_modules/${p}/`))) return 'utils';

            return undefined;
          },
        },
      },
    },
  };
});
