import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to serve onnxruntime-web .mjs/.wasm files from public/models
// without Vite's module transform (which blocks imports from /public)
function onnxWasmPlugin() {
  return {
    name: 'onnx-wasm-serve',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Intercept requests for .mjs and .wasm files in /models/
        const url = req.url?.split('?')[0]; // strip ?import query
        if (url && url.startsWith('/models/') && (url.endsWith('.mjs') || url.endsWith('.wasm'))) {
          const filePath = path.join(__dirname, 'public', url);
          if (fs.existsSync(filePath)) {
            const contentType = url.endsWith('.mjs')
              ? 'application/javascript'
              : 'application/wasm';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署时需要设置 base 路径
  // 在 GitHub Actions 中通过环境变量 GITHUB_PAGES=true 触发
  base: process.env.GITHUB_PAGES ? '/Manila_webui/' : '/',
  plugins: [react(), onnxWasmPlugin()],
  resolve: {
    alias: {
      '@manila/engine': path.resolve(__dirname, '../packages/engine/src/index.ts'),
      '@manila/rl': path.resolve(__dirname, '../packages/rl/src/index.ts'),
      '@manila/strategy': path.resolve(__dirname, '../packages/strategy/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@manila/engine', '@manila/rl', '@manila/strategy'],
  },
})

