import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { pathToFileURL } from 'url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vercel-api-mock',
      configureServer(server) {
        // Menyuntikkan secara paksa seluruh isi .env.local ke dalam process.env untuk dipakai oleh mock server
        const env = loadEnv(server.config.mode, process.cwd(), '');
        Object.assign(process.env, env);

        server.middlewares.use('/api/send-email', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString() });
            req.on('end', async () => {
              try {
                req.body = JSON.parse(body || '{}');
              } catch (e) {
                req.body = {};
              }
              
              // Mock Vercel response helpers
              res.status = (code) => { res.statusCode = code; return res; };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              try {
                // Gunakan path absolut untuk Windows compatibility (ESM Safe)
                const absolutePath = path.resolve(process.cwd(), './api/send-email.js');
                const moduleUrl = pathToFileURL(absolutePath).href;
                const handler = await import(moduleUrl);
                await handler.default(req, res);
              } catch (err) {
                console.error('API Error:', err);
                res.status(500).json({ message: 'Local API Error', error: err.message });
              }
            });
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });

        server.middlewares.use('/api/juri-info', (req, res) => {
          if (req.method === 'GET') {
            const url = new URL(req.url, `http://${req.headers.host}`);
            req.query = Object.fromEntries(url.searchParams);
            
            // Mock Vercel response helpers
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };

            (async () => {
              try {
                const absolutePath = path.resolve(process.cwd(), './api/juri-info.js');
                const moduleUrl = pathToFileURL(absolutePath).href;
                const handler = await import(moduleUrl);
                await handler.default(req, res);
              } catch (err) {
                console.error('API Error:', err);
                res.status(500).json({ message: 'Local API Error', error: err.message });
              }
            })();
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });
      }
    }
  ],
  server: {
    port: 5173,
    open: true,
    allowedHosts: [
      'rlyansr.my.id',
      'www.rlyansr.my.id'
    ],
  },
});
