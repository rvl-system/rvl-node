import { type NetworkInterfaceInfo } from 'node:os';

import { vi } from 'vitest';

import {
  buildIdReply,
  buildObservation,
  buildReference,
  FIRST_BOARD,
  readScene,
  RVLA_PORT,
  type SentScene,
} from './packets.ts';

type SentPacket = { bytes: Buffer; port: number; address: string };

// The mocked modules' state, hoisted so the mock factories can reach it. One
// fake socket per createSocket(), the latest of which is the node's
const fakes = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  class FakeSocket {
    sent: { bytes: Buffer; port: number; address: string }[] = [];
    boundPort: number | undefined;
    broadcast = false;
    closed = false;
    listeners = new Map<string, Listener[]>();

    on(event: string, listener: Listener): this {
      const listeners = this.listeners.get(event) ?? [];
      listeners.push(listener);
      this.listeners.set(event, listeners);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      for (const listener of this.listeners.get(event) ?? []) {
        listener(...args);
      }
    }

    bind(port: number): void {
      this.boundPort = port;
      queueMicrotask(() => {
        if (state.portInUse) {
          const error = new Error(`bind EADDRINUSE 0.0.0.0:${port}`);
          this.emit('error', Object.assign(error, { code: 'EADDRINUSE' }));
        } else {
          this.emit('listening');
        }
      });
    }

    setBroadcast(flag: boolean): void {
      this.broadcast = flag;
    }

    send(
      bytes: Buffer,
      port: number,
      address: string,
      callback: (error?: Error) => void
    ): void {
      this.sent.push({ bytes: Buffer.from(bytes), port, address });
      queueMicrotask(() => {
        callback();
      });
    }

    close(): void {
      this.closed = true;
    }
  }

  const state = {
    interfaces: {} as Record<string, NetworkInterfaceInfo[] | undefined>,
    portInUse: false,
    socket: undefined as FakeSocket | undefined,
    createSocket: (): FakeSocket => {
      state.socket = new FakeSocket();
      return state.socket;
    },
  };
  return state;
});

// networkInterfaces is the one export of node:os anything in src uses
vi.mock('node:os', () => ({ networkInterfaces: () => fakes.interfaces }));

vi.mock('node:dgram', () => ({ createSocket: fakes.createSocket }));

export function ipv4(
  address: string,
  netmask = '255.255.255.0',
  internal = false
): NetworkInterfaceInfo {
  return {
    address,
    netmask,
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal,
    cidr: null,
  };
}

const FLEET_ADDRESS = '192.168.4.5';
export const FLEET_BROADCAST = '192.168.4.255';

export const DEFAULT_INTERFACES = {
  lo0: [ipv4('127.0.0.1', '255.0.0.0', true)],
  en0: [ipv4(FLEET_ADDRESS)],
};

type NodeOptions = {
  interfaces?: Record<string, NetworkInterfaceInfo[] | undefined>;
  portInUse?: boolean;
};

export function setInterfaces(
  interfaces: Record<string, NetworkInterfaceInfo[] | undefined>
): void {
  fakes.interfaces = interfaces;
}

export function setPortInUse(inUse: boolean): void {
  fakes.portInUse = inUse;
}

function getSocket() {
  if (!fakes.socket) {
    throw new Error('No socket has been created yet');
  }
  return fakes.socket;
}

// A fresh rvl-node, not yet initialized: fake timers from 0 over the timers
// and performance.now, the console quiet, the module registry cleared so
// every module's state starts over
export async function loadNode(options: NodeOptions = {}) {
  vi.restoreAllMocks();
  vi.useFakeTimers({
    now: 0,
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'performance',
    ],
  });
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  fakes.interfaces = options.interfaces ?? DEFAULT_INTERFACES;
  fakes.portInUse = options.portInUse ?? false;
  fakes.socket = undefined;
  vi.resetModules();
  const [rvl, clock, animation, identity, transport, net, parametric] =
    await Promise.all([
      import('../src/rvl.ts'),
      import('../src/clock.ts'),
      import('../src/protocols/animation.ts'),
      import('../src/protocols/identity.ts'),
      import('../src/transport.ts'),
      import('../src/net.ts'),
      import('../src/parametric.ts'),
    ]);

  let nextSetId = 0;

  // Moves the clock and runs every timer in it, then lets the microtasks the
  // timers queued run. Synchronous on purpose: the async variant waits a real
  // timeout per fake timer
  async function advance(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await vi.advanceTimersByTimeAsync(0);
  }

  function deliver(bytes: Buffer, address = '192.168.4.1'): void {
    getSocket().emit('message', bytes, { address, port: 4979 });
  }

  function sent(): SentPacket[] {
    return getSocket().sent;
  }

  function clearSent(): void {
    getSocket().sent.length = 0;
  }

  function scenes(): SentScene[] {
    return sent()
      .filter((packet) => packet.port === RVLA_PORT)
      .map((packet) => readScene(packet.bytes));
  }

  function assignId(id: number): void {
    deliver(buildIdReply(id));
  }

  // One full set, two boards observing each reference at this node's time plus
  // delta, then the next set's first reference, which processes it
  async function syncClock(delta = 0): Promise<void> {
    const now = performance.now();
    const own = clock.isClockSynchronized()
      ? clock.toAnimationClock(now)
      : Math.floor(now);
    for (let i = 0; i < 3; i++) {
      const id = nextSetId + i;
      deliver(buildReference(id, i === 0));
      deliver(buildObservation(FIRST_BOARD, id, own + delta));
      deliver(buildObservation(FIRST_BOARD + 1, id, own + delta));
    }
    deliver(buildReference(nextSetId + 3, true));
    nextSetId += 4;
    await advance(0);
  }

  return {
    rvl,
    clock,
    animation,
    identity,
    transport,
    net,
    parametric,
    warn,
    get socket() {
      return getSocket();
    },
    advance,
    deliver,
    sent,
    clearSent,
    scenes,
    assignId,
    syncClock,
    now: () => performance.now(),
    frame: () => clock.getAnimationFrame(),
  };
}

export type Node = Awaited<ReturnType<typeof loadNode>>;

export async function startNode(
  options: NodeOptions & { networkInterface?: string } = {}
): Promise<Node> {
  const node = await loadNode(options);
  await node.rvl.init({ networkInterface: options.networkInterface ?? 'en0' });
  return node;
}
