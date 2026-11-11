import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';

import { startFleetAndSetup } from './setup.ts';

const PACKAGE_DIR = join(import.meta.dirname, '../..');
const CLIENT_DIR = join(PACKAGE_DIR, 'dist/client');
const VITE_CONFIG = join(PACKAGE_DIR, 'vite.config.mjs');
const INDEX_HTML = join(PACKAGE_DIR, 'src/client/index.html');

type ServerOptions = {
  port: number;
  networkInterface: string;
  dev: boolean;
  onFleetError: (error: Error) => void;
};

async function serveBuiltClient(server: FastifyInstance): Promise<void> {
  if (!existsSync(CLIENT_DIR)) {
    throw new Error(
      `No built client at ${CLIENT_DIR}. Run npm run build first`
    );
  }
  await server.register(fastifyStatic, { root: CLIENT_DIR });
}

// Vite and middie load only here, so a start without --dev never imports
// them. Vite's own HTML serving stays off: its fallback answers any GET,
// the socket's upgrade included, which passes through the middlewares too
async function serveDevClient(server: FastifyInstance): Promise<void> {
  const [{ createServer }, { default: middie }] = await Promise.all([
    import('vite'),
    import('@fastify/middie'),
  ]);
  // Loaded natively: the default bundles the config to a temp file that
  // node --watch sees come and go, restarting forever
  const vite = await createServer({
    configFile: VITE_CONFIG,
    configLoader: 'native',
    server: { middlewareMode: true },
    appType: 'custom',
  });
  await server.register(middie);
  server.use(vite.middlewares);
  server.get('/', async (request, reply) => {
    const html = await readFile(INDEX_HTML, 'utf8');
    return reply
      .type('text/html')
      .send(await vite.transformIndexHtml(request.url, html));
  });
  server.addHook('onClose', async () => {
    await vite.close();
  });
}

export async function startServer({
  port,
  networkInterface,
  dev,
  onFleetError,
}: ServerOptions): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  await (dev ? serveDevClient(server) : serveBuiltClient(server));
  await server.register(fastifyWebsocket);
  startFleetAndSetup({ server, networkInterface, onFleetError });
  await server.listen({ port, host: '0.0.0.0' });
  return server;
}
