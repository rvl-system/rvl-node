import { type WebSocket as Socket } from '@fastify/websocket';
import { type FastifyInstance } from 'fastify';
import {
  MAX_CURRENT_LIMIT,
  MAX_PIXEL_COUNT,
  NICKNAME_LENGTH,
  NUM_CHANNELS,
} from 'rvl-node';

import {
  type Board,
  type ClientMessage,
  isColorOrder,
  isProperty,
  type Limits,
  type ServerMessage,
  SOCKET_PATH,
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

// The host registers @fastify/websocket before this, and listens after
type SetupOptions = {
  server: FastifyInstance;
  networkInterface: string;
  onFleetError: (error: Error) => void;
  // Called after every listing and every board's answer. Passing it keeps the
  // boards listed with no page open
  onBoardsChange?: (boards: Board[]) => void;
};

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

function onSocketOpen(socket: Socket): void {
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
}

export function startFleetAndSetup({
  server,
  networkInterface,
  onFleetError,
  onBoardsChange,
}: SetupOptions): void {
  server.get(SOCKET_PATH, { websocket: true }, onSocketOpen);
  startFleet({
    networkInterface,
    onChange: (what) => {
      broadcastChange(what);
      if (what === 'boards' && onBoardsChange !== undefined) {
        // Queued, since a board's answer arrives inside a request's try,
        // which would turn the host's throw into a failed request
        queueMicrotask(() => {
          onBoardsChange(getBoards());
        });
      }
    },
    onError: onFleetError,
  });
  if (onBoardsChange !== undefined) {
    watchBoards();
  }
}
