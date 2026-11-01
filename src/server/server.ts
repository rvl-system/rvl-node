import { existsSync } from 'node:fs';
import { join } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';

import { type ServerMessage } from '../common/messages.ts';
import {
  getBoards,
  getFleet,
  startFleet,
  unwatchBoards,
  watchBoards,
} from './fleet.ts';

// From the package root, so it is the same folder whether this runs from
// dist/server or, under dev:server, from src/server
const CLIENT_DIR = join(import.meta.dirname, '../../dist/client');

type ServerOptions = {
  port: number;
  networkInterface: string;
  onFleetError: (error: Error) => void;
};

type Socket = fastifyWebsocket.WebSocket;

const clients = new Set<Socket>();

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

export async function startServer({
  port,
  networkInterface,
  onFleetError,
}: ServerOptions): Promise<void> {
  const server = Fastify({ logger: false });
  if (existsSync(CLIENT_DIR)) {
    await server.register(fastifyStatic, { root: CLIENT_DIR });
  } else {
    console.warn(
      `No built client at ${CLIENT_DIR}. Run npm run build, or npm run dev:client for the page`
    );
  }
  await server.register(fastifyWebsocket);
  server.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    send(socket, { type: 'hello', fleet: getFleet(), boards: getBoards() });
    watchBoards();
    socket.on('message', () => {
      console.warn('Ignoring a message from a client; nothing is accepted yet');
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
}
