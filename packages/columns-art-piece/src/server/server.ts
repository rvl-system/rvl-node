import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { startFleetAndSetup } from 'rvl-setup/server';

import {
  COLOR_SETTINGS,
  NUMBER_RANGES,
  NUMBER_SETTINGS,
  type ServerMessage,
  type Settings,
} from '../common/messages.ts';
import { getColumns, replaceColumnsIfChanged } from './columns.ts';
import { showColumnsBetweenPulses, startPulses } from './pulse.ts';
import { applySettings, getSettings } from './show.ts';

const PACKAGE_DIR = join(import.meta.dirname, '../..');
const CLIENT_DIR = join(PACKAGE_DIR, 'dist/client');
const VITE_CONFIG = join(PACKAGE_DIR, 'vite.config.mjs');
const INDEX_HTML = join(PACKAGE_DIR, 'src/client/index.html');

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

type ServerOptions = {
  port: number;
  networkInterface: string;
  dev: boolean;
  onFleetError: (error: Error) => void;
};

type Socket = fastifyWebsocket.WebSocket;

const clients = new Set<Socket>();

function send(socket: Socket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message: ServerMessage): void {
  for (const client of clients) {
    send(client, message);
  }
}

function readText(data: Buffer | ArrayBuffer | Buffer[]): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString();
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString();
  }
  return data.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && COLOR_PATTERN.test(value);
}

function isWholeNumberWithin(
  value: unknown,
  { min, max }: { min: number; max: number }
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

// The settings a set message carries, not yet checked
function parseSetMessage(text: string): Record<string, unknown> | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (
    !isRecord(parsed) ||
    parsed.type !== 'set' ||
    !isRecord(parsed.settings)
  ) {
    return undefined;
  }
  return parsed.settings;
}

function pickValidSettings(
  candidate: Record<string, unknown>
): Partial<Settings> {
  const settings: Partial<Settings> = {};
  for (const key of COLOR_SETTINGS) {
    const value = candidate[key];
    if (isColor(value)) {
      settings[key] = value;
    }
  }
  for (const key of NUMBER_SETTINGS) {
    const value = candidate[key];
    if (isWholeNumberWithin(value, NUMBER_RANGES[key])) {
      settings[key] = value;
    }
  }
  return settings;
}

function handleMessage(text: string | undefined): void {
  const candidate = text === undefined ? undefined : parseSetMessage(text);
  if (candidate === undefined) {
    console.warn('Ignoring a message the server does not understand');
    return;
  }
  const settings = pickValidSettings(candidate);
  if (Object.keys(settings).length < Object.keys(candidate).length) {
    console.warn('Dropping settings the server does not accept');
  }
  applySettings(settings);
  showColumnsBetweenPulses();
  broadcast({ type: 'settings', settings: getSettings() });
}

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
// a socket's upgrade included, which passes through the middlewares too
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
  server.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    send(socket, {
      type: 'hello',
      columns: getColumns(),
      settings: getSettings(),
    });
    socket.on('message', (data, isBinary) => {
      handleMessage(isBinary ? undefined : readText(data));
    });
    socket.on('close', () => {
      clients.delete(socket);
    });
  });
  startPulses();
  startFleetAndSetup({
    server,
    networkInterface,
    onFleetError,
    onBoardsChange: (boards) => {
      if (replaceColumnsIfChanged(boards)) {
        showColumnsBetweenPulses();
        broadcast({ type: 'columns', columns: getColumns() });
      }
    },
  });
  await server.listen({ port, host: '0.0.0.0' });
  return server;
}
