import { type NodeStatus } from 'rvl-node';
import { vi } from 'vitest';

import { type ServerMessage } from '../src/common/messages.ts';

type Listener = (...args: unknown[]) => void;

type Call = {
  name: 'getNodes' | 'configureNode' | 'identifyNode';
  args: unknown[];
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

// The rvl-node fake's state, hoisted so the mock factory can reach it:
// the listeners the server registers, what the fleet looks like, and every
// request made of rvl-node with the settlers of the promise it returned
const fake = vi.hoisted(() => {
  const state = {
    listeners: new Map<string, Listener[]>(),
    deviceId: undefined as number | undefined,
    connected: false,
    networkInterface: '',
    calls: [] as Call[],
    reset(): void {
      state.listeners.clear();
      state.deviceId = undefined;
      state.connected = false;
      state.networkInterface = '';
      state.calls.length = 0;
    },
    emit(event: string, ...args: unknown[]): void {
      for (const listener of state.listeners.get(event) ?? []) {
        listener(...args);
      }
    },
    record(name: Call['name'], args: unknown[]): Promise<unknown> {
      return new Promise((resolve, reject) => {
        state.calls.push({ name, args, resolve, reject });
      });
    },
  };
  return state;
});

vi.mock('rvl-node', () => ({
  MAX_PIXEL_COUNT: 300,
  NUM_CHANNELS: 8,
  NICKNAME_LENGTH: 16,
  init: (options: { networkInterface: string }): void => {
    fake.networkInterface = options.networkInterface;
  },
  on: (event: string, listener: Listener): void => {
    const listeners = fake.listeners.get(event) ?? [];
    listeners.push(listener);
    fake.listeners.set(event, listeners);
  },
  isConnected: (): boolean => fake.connected,
  getDeviceId: (): number | undefined => fake.deviceId,
  getNetworkInterface: (): string => fake.networkInterface,
  getNodes: (): Promise<unknown> => fake.record('getNodes', []),
  configureNode: (...args: unknown[]): Promise<unknown> =>
    fake.record('configureNode', args),
  identifyNode: (...args: unknown[]): Promise<unknown> =>
    fake.record('identifyNode', args),
}));

// The server refuses to start without a built client, which the tests
// never fetch
vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return { ...original, existsSync: () => true };
});

function readFrame(data: Buffer | ArrayBuffer | Buffer[]): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString();
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString();
  }
  return data.toString();
}

export function board(
  deviceId: number,
  overrides: Partial<NodeStatus> = {}
): NodeStatus {
  return {
    deviceId,
    capabilities: {
      channel: true,
      brightness: true,
      pixelCount: true,
      colorOrder: true,
      statusLedBrightness: true,
      nickname: true,
    },
    channel: 0,
    brightness: 255,
    pixelCount: 300,
    colorOrder: 'GRB',
    statusLedBrightness: 60,
    nickname: '',
    ...overrides,
  };
}

export type Client = {
  frames: ServerMessage[];
  next: () => Promise<ServerMessage>;
  send: (message: object) => void;
  sendText: (text: string) => void;
  sendBinary: () => void;
  close: () => Promise<void>;
};

// A fresh server on an ephemeral port over a fresh rvl-node fake, with the
// console quiet and the module registry cleared so every module's state
// starts over. Fake timers go on only once Fastify is up, so it started on
// real ones; the one timer faked after that is the listing interval
export async function startTestServer() {
  vi.restoreAllMocks();
  vi.useRealTimers();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  fake.reset();
  vi.resetModules();
  const { startServer } = await import('../src/server/server.ts');
  const onFleetError = vi.fn<(error: Error) => void>();
  const server = await startServer({
    port: 0,
    networkInterface: 'en0',
    dev: false,
    onFleetError,
  });
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
  });

  // setImmediate is real, so this runs every microtask and stream event
  // the server has queued
  function flush(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  async function advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await flush();
  }

  // The plugin's own in-memory client: no port and no network. It listens
  // from the start, since hello arrives as the socket opens, before injectWS
  // resolves
  async function connect(): Promise<Client> {
    const frames: ServerMessage[] = [];
    const waiting: ((message: ServerMessage) => void)[] = [];
    const ws = await server.injectWS(
      '/ws',
      {},
      {
        onInit: (socket) => {
          socket.on('message', (data) => {
            const message = JSON.parse(readFrame(data)) as ServerMessage;
            const waiter = waiting.shift();
            if (waiter) {
              waiter(message);
            } else {
              frames.push(message);
            }
          });
        },
      }
    );
    return {
      frames,
      next: () => {
        const queued = frames.shift();
        return queued
          ? Promise.resolve(queued)
          : new Promise((resolve) => waiting.push(resolve));
      },
      send: (message) => {
        ws.send(JSON.stringify(message));
      },
      sendText: (text) => {
        ws.send(text);
      },
      sendBinary: () => {
        ws.send(Buffer.from([1, 2, 3]));
      },
      // Dropped rather than closed: over the in-memory streams a close
      // handshake never reaches the server's close event, and a drop does
      close: () =>
        new Promise((resolve) => {
          ws.once('close', () => {
            resolve();
          });
          ws.terminate();
        }),
    };
  }

  function calls(name: Call['name']): Call[] {
    return fake.calls.filter((call) => call.name === name);
  }

  async function answer(
    call: Call,
    value: NodeStatus | NodeStatus[]
  ): Promise<void> {
    call.resolve(value);
    await flush();
  }

  async function reject(call: Call, message: string): Promise<void> {
    call.reject(new Error(message));
    await flush();
  }

  async function join(deviceId: number): Promise<void> {
    fake.deviceId = deviceId;
    fake.connected = true;
    fake.emit('connected');
    await flush();
  }

  async function leave(): Promise<void> {
    fake.connected = false;
    fake.deviceId = undefined;
    fake.emit('disconnected');
    await flush();
  }

  function fail(error: Error): void {
    fake.emit('error', error);
  }

  // Real timers back first, so the plugin's close path and the WebSocket
  // close handshakes run on them
  async function stop(): Promise<void> {
    vi.useRealTimers();
    await server.close();
    vi.restoreAllMocks();
  }

  return {
    warn,
    onFleetError,
    connect,
    flush,
    advance,
    calls,
    answer,
    reject,
    join,
    leave,
    fail,
    stop,
  };
}
