import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  MAX_CURRENT_LIMIT,
  MAX_PIXEL_COUNT,
  NICKNAME_LENGTH,
  NUM_CHANNELS,
} from 'rvl-node';

import {
  type ClientMessage,
  isColorOrder,
  isProperty,
  type Limits,
  type ServerMessage,
} from '../common/messages.ts';
import {
  configureBoard,
  getBoards,
  getFleet,
  identifyBoard,
  startFleet,
  unwatchBoards,
  watchBoards,
} from './fleet.ts';

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

type Socket = fastifyWebsocket.WebSocket;

const clients = new Set<Socket>();

const LIMITS: Limits = {
  maxPixelCount: MAX_PIXEL_COUNT,
  numChannels: NUM_CHANNELS,
  nicknameLength: NICKNAME_LENGTH,
  maxCurrentLimit: MAX_CURRENT_LIMIT,
};

function send(socket: Socket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastChange(what: 'fleet' | 'boards'): void {
  const message: ServerMessage =
    what === 'fleet'
      ? { type: 'fleet', fleet: getFleet() }
      : { type: 'boards', boards: getBoards() };
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

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

// rvl-node checks the ranges
function parseConfigure(
  requestId: number,
  deviceId: number,
  property: unknown,
  value: unknown
): ClientMessage | undefined {
  if (!isProperty(property)) {
    return undefined;
  }
  switch (property) {
    case 'channel':
    case 'brightness':
    case 'pixelCount':
    case 'statusLedBrightness':
    case 'currentLimit':
      return isInteger(value)
        ? { type: 'configure', requestId, deviceId, property, value }
        : undefined;
    case 'colorOrder':
      return isColorOrder(value)
        ? { type: 'configure', requestId, deviceId, property, value }
        : undefined;
    case 'nickname':
      return typeof value === 'string'
        ? { type: 'configure', requestId, deviceId, property, value }
        : undefined;
  }
}

function parseClientMessage(text: string): ClientMessage | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    !('requestId' in parsed) ||
    !('deviceId' in parsed) ||
    !isInteger(parsed.requestId) ||
    !isInteger(parsed.deviceId)
  ) {
    return undefined;
  }
  const { requestId, deviceId } = parsed;
  if (parsed.type === 'identify') {
    return { type: 'identify', requestId, deviceId };
  }
  if (
    parsed.type === 'configure' &&
    'property' in parsed &&
    'value' in parsed
  ) {
    return parseConfigure(requestId, deviceId, parsed.property, parsed.value);
  }
  return undefined;
}

async function handleRequest(
  socket: Socket,
  message: ClientMessage
): Promise<void> {
  try {
    const board =
      message.type === 'identify'
        ? await identifyBoard(message.deviceId)
        : await configureBoard(message);
    send(socket, { type: 'result', requestId: message.requestId, board });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    send(socket, {
      type: 'result',
      requestId: message.requestId,
      error: reason,
    });
  }
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
// the /ws upgrade included, which passes through the middlewares too
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
      fleet: getFleet(),
      boards: getBoards(),
      limits: LIMITS,
    });
    watchBoards();
    socket.on('message', (data, isBinary) => {
      const message = isBinary ? undefined : parseClientMessage(readText(data));
      if (message === undefined) {
        console.warn('Ignoring a message the server does not understand');
        return;
      }
      void handleRequest(socket, message);
    });
    socket.on('close', () => {
      clients.delete(socket);
      unwatchBoards();
    });
  });
  startFleet({
    networkInterface,
    onChange: broadcastChange,
    onError: onFleetError,
  });
  await server.listen({ port, host: '0.0.0.0' });
  return server;
}
