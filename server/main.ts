import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCoachHandler, type CoachHandlerOptions } from './coach-handler.ts';
import { createStaticHandler } from './static-handler.ts';

export interface HyperfocusServerOptions extends CoachHandlerOptions {
  distDirectory?: string;
}
/** Use this factory in tests or embedders. Importing the module does not listen on a port. */
export function createHyperfocusServer(options: HyperfocusServerOptions = {}) {
  const coach = createCoachHandler(options);
  const files = createStaticHandler(
    options.distDirectory ?? fileURLToPath(new URL('../dist/', import.meta.url)),
  );
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '/').split('?')[0];
    const task = path.startsWith('/api/') ? coach(req, res) : files(req, res);
    void task.catch(() => {
      if (!res.writableEnded && !res.destroyed) {
        res.statusCode = 500;
        res.end('The local server could not complete this request.');
      }
    });
  });
}
const invokedPath = process.argv[1];
if (invokedPath && pathToFileURL(resolve(invokedPath)).href === import.meta.url) {
  const server = createHyperfocusServer();
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.on('error', (error) => {
    const code = 'code' in error ? error.code : undefined;
    console.error(
      code === 'EADDRINUSE'
        ? 'Port 5180 is in use. Stop the other local Hyperfocus process before starting production mode.'
        : 'Could not start Hyperfocus on 127.0.0.1:5180.',
    );
    process.exitCode = 1;
  });
  server.listen(5180, '127.0.0.1', () => {
    console.info('Hyperfocus is available at http://127.0.0.1:5180');
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      server.close(() => {
        process.exitCode = 0;
      });
      server.closeIdleConnections();
    });
}
