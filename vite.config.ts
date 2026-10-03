import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import searchHandler from './api/search';
import patientsHandler from './api/patients';
import hospitalsHandler from './api/hospitals';
import accessRequestsHandler from './api/access-requests';
import trustedHospitalsHandler from './api/trusted-hospitals';
import authHandler from './api/auth';
import aiIntakeHandler from './api/ai-intake';
import appointmentsHandler from './api/appointments';
import emergenciesHandler from './api/emergencies';
import documentsHandler from './api/documents';

const devApiPlugin = (): Plugin => {
  const routes: Record<string, (req: any, res: any) => Promise<any> | any> = {
    '/api/auth': authHandler,
    '/api/ai-intake': aiIntakeHandler,
    '/api/search': searchHandler,
    '/api/patients': patientsHandler,
    '/api/hospitals': hospitalsHandler,
    '/api/access-requests': accessRequestsHandler,
    '/api/trusted-hospitals': trustedHospitalsHandler,
    '/api/appointments': appointmentsHandler,
    '/api/emergencies': emergenciesHandler,
    '/api/documents': documentsHandler,
  };

  const createMiddleware = () => async (req: any, res: any, next: any) => {
    if (!req.url || !req.url.startsWith('/api/')) {
      return next();
    }

    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const pathname = parsedUrl.pathname;
      const handler = routes[pathname];

      if (!handler) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: `Endpoint not found: ${pathname}` }));
        return;
      }

      // Polyfill query on req
      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        query[key] = val;
      });
      req.query = query;

      // Polyfill res.status and res.json for Express/Vercel compatibility
      res.status = function (code: number) {
        res.statusCode = code;
        return res;
      };
      res.json = function (data: any) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: any) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on('end', async () => {
          const rawBuffer = Buffer.concat(chunks);
          try {
            req.body = JSON.parse(rawBuffer.toString('utf-8'));
          } catch {
            req.body = {};
          }
          req.rawBody = rawBuffer;
          await handler(req, res);
        });
      } else {
        await handler(req, res);
      }
    } catch (err: any) {
      console.error('[dev-api] Error handling API request:', err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err?.message || 'Internal Server Error' }));
      }
    }
  };

  return {
    name: 'dev-api-middleware',
    configureServer(server) {
      server.middlewares.use(createMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware());
    },
  };
};

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    open: false,
    hmr: {
      overlay: false,
    },
  },
});

