import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { runDiagnosis } from './api/diagnoseHandler';

const createLocalDiagnosePlugin = (): Plugin => {
  const attachHandler = (middlewares: { use: (...handlers: any[]) => void }) => {
    middlewares.use('/api/diagnose', (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'POST');
        res.end(`Method ${req.method ?? 'UNKNOWN'} Not Allowed`);
        return;
      }

      let rawBody = '';

      req.on('data', chunk => {
        rawBody += chunk;
      });

      req.on('error', error => {
        console.error('Erro ao ler corpo da requisição local /api/diagnose:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Falha ao processar a requisição local.' }));
      });

      req.on('end', async () => {
        try {
          const parsedBody = rawBody ? JSON.parse(rawBody) : {};
          const { status, body } = await runDiagnosis(parsedBody);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        } catch (error) {
          console.error('Erro ao simular endpoint /api/diagnose em modo local:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Erro interno ao simular o diagnóstico por IA.' }));
        }
      });
    });
  };

  return {
    name: 'local-diagnose-endpoint',
    configureServer(server) {
      attachHandler(server.middlewares);
    },
    configurePreviewServer(server) {
      attachHandler(server.middlewares);
    },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react(), createLocalDiagnosePlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
