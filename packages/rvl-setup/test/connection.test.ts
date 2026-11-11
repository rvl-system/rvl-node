import { afterEach, expect, test, vi } from 'vitest';

import {
  type Board,
  type Fleet,
  type Limits,
  type ServerMessage,
} from '../src/common/messages.ts';

type Listener = (event: { data?: string }) => void;

// Every socket the page opened, in order; the last is the live one
const created: FakeWebSocket[] = [];

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly url: string;
  readyState: number = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    created.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  send(text: string): void {
    this.sent.push(text);
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.emit('open', {});
  }

  receive(message: ServerMessage): void {
    this.emit('message', { data: JSON.stringify(message) });
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close', {});
  }

  private emit(type: string, event: { data?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const ONLINE: Fleet = { interface: 'en0', connected: true, deviceId: 4 };
const LIMITS: Limits = {
  maxPixelCount: 300,
  numChannels: 8,
  nicknameLength: 16,
  maxCurrentLimit: 65535,
};

function board(deviceId: number, overrides: Partial<Board> = {}): Board {
  return {
    deviceId,
    capabilities: {
      channel: true,
      brightness: true,
      pixelCount: true,
      colorOrder: true,
      statusLedBrightness: true,
      nickname: true,
      currentLimit: true,
    },
    channel: 0,
    brightness: 255,
    pixelCount: 300,
    colorOrder: 'GRB',
    statusLedBrightness: 60,
    nickname: '',
    currentLimit: 1500,
    answering: true,
    ...overrides,
  };
}

const HELLO: ServerMessage = {
  type: 'hello',
  fleet: ONLINE,
  boards: [board(2), board(3)],
  limits: LIMITS,
};

// A fresh page: fake timers for the reconnect delay, the browser globals
// the connection reads stubbed, the module registry cleared so the atoms
// and the socket state start over, and the connection opened. jotai itself
// is loaded once from node_modules, so its default store is the one the
// connection writes
async function loadClient() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  created.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('window', {
    location: { protocol: 'http:', host: 'rvl-setup.test' },
  });
  vi.resetModules();
  const [connection, state, { getDefaultStore }] = await Promise.all([
    import('../src/client/connection.ts'),
    import('../src/client/state.ts'),
    import('jotai'),
  ]);
  const store = getDefaultStore();
  connection.connect();
  function socket(): FakeWebSocket {
    const latest = created.at(-1);
    if (latest === undefined) {
      throw new Error('No socket has been opened');
    }
    return latest;
  }
  return { connection, state, store, socket };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('connect opens the socket on the page host and tracks its state', async () => {
  const { state, store, socket } = await loadClient();
  expect(socket().url).toBe('ws://rvl-setup.test/rvl-setup/ws');
  expect(store.get(state.socketAtom)).toBe('connecting');
  socket().open();
  expect(store.get(state.socketAtom)).toBe('open');
});

test('hello fills the fleet, the limits and the roster', async () => {
  const { state, store, socket } = await loadClient();
  socket().open();
  socket().receive(HELLO);
  expect(store.get(state.fleetAtom)).toEqual(ONLINE);
  expect(store.get(state.limitsAtom)).toEqual(LIMITS);
  expect(store.get(state.boardIdsAtom)).toEqual([2, 3]);
  expect(store.get(state.boardFamily(2))).toEqual(board(2));
  expect(store.get(state.boardFamily(3))).toEqual(board(3));
});

test('a boards message replaces only the boards that changed', async () => {
  const { state, store, socket } = await loadClient();
  socket().open();
  socket().receive(HELLO);
  const held = store.get(state.boardFamily(2));
  const ids = store.get(state.boardIdsAtom);
  socket().receive({
    type: 'boards',
    boards: [board(2), board(3, { nickname: 'Right' })],
  });
  expect(store.get(state.boardFamily(2))).toBe(held);
  expect(store.get(state.boardFamily(3))).toEqual(
    board(3, { nickname: 'Right' })
  );
  expect(store.get(state.boardIdsAtom)).toBe(ids);
});

test('a board that leaves the roster is cleared and its ID dropped', async () => {
  const { state, store, socket } = await loadClient();
  socket().open();
  socket().receive(HELLO);
  socket().receive({ type: 'boards', boards: [board(3)] });
  expect(store.get(state.boardFamily(2))).toBeUndefined();
  expect(store.get(state.boardIdsAtom)).toEqual([3]);
});

test('a fleet message updates the fleet', async () => {
  const { state, store, socket } = await loadClient();
  socket().open();
  socket().receive(HELLO);
  const offline: Fleet = { interface: 'en0', connected: false };
  socket().receive({ type: 'fleet', fleet: offline });
  expect(store.get(state.fleetAtom)).toEqual(offline);
});

test('identify sends a numbered request and settles on its result', async () => {
  const { connection, socket } = await loadClient();
  socket().open();
  const first = connection.identifyBoard(2);
  const second = connection.identifyBoard(3);
  expect(socket().sent.map((text) => JSON.parse(text) as unknown)).toEqual([
    { type: 'identify', deviceId: 2, requestId: 1 },
    { type: 'identify', deviceId: 3, requestId: 2 },
  ]);
  socket().receive({ type: 'result', requestId: 99, board: board(9) });
  socket().receive({ type: 'result', requestId: 2, board: board(3) });
  await expect(second).resolves.toEqual(board(3));
  const rejection = expect(first).rejects.toThrow('Node 2 did not answer');
  socket().receive({
    type: 'result',
    requestId: 1,
    error: 'Node 2 did not answer',
  });
  await rejection;
});

test('configure sends the property and its value', async () => {
  const { connection, socket } = await loadClient();
  socket().open();
  void connection.configureBoard(2, { property: 'nickname', value: 'x' });
  expect(JSON.parse(socket().sent[0]) as unknown).toEqual({
    type: 'configure',
    deviceId: 2,
    property: 'nickname',
    value: 'x',
    requestId: 1,
  });
});

test('a request before the socket opens rejects and sends nothing', async () => {
  const { connection, socket } = await loadClient();
  await expect(connection.identifyBoard(2)).rejects.toThrow(
    'Not connected to the server'
  );
  expect(socket().sent).toHaveLength(0);
});

test('a close rejects what is pending and reconnects after 250 ms', async () => {
  const { connection, state, store, socket } = await loadClient();
  socket().open();
  socket().receive(HELLO);
  const pending = connection.identifyBoard(2);
  const rejection = expect(pending).rejects.toThrow(
    'Disconnected from the server'
  );
  socket().close();
  expect(store.get(state.socketAtom)).toBe('closed');
  await rejection;
  expect(created).toHaveLength(1);
  vi.advanceTimersByTime(250);
  expect(created).toHaveLength(2);
  expect(store.get(state.socketAtom)).toBe('connecting');
  socket().open();
  socket().receive({ ...HELLO, boards: [board(5)] });
  expect(store.get(state.boardIdsAtom)).toEqual([5]);
  expect(store.get(state.boardFamily(2))).toBeUndefined();
  expect(store.get(state.boardFamily(5))).toEqual(board(5));
});
