import {
  configureNode,
  getDeviceId,
  getNetworkInterface,
  getNodes,
  identifyNode,
  init,
  isConnected,
  type NodeStatus,
  on,
} from 'rvl-node';

import {
  type Board,
  type ConfigureMessage,
  type Fleet,
} from '../common/messages.ts';

const LISTING_PERIOD = 5000;
const MISSES_BEFORE_DROP = 3;

type FleetOptions = {
  networkInterface: string;
  onChange: (what: 'fleet' | 'boards') => void;
  onError: (error: Error) => void;
};

type RosterEntry = { status: NodeStatus; misses: number };

type Settlers = {
  resolve: (board: Board) => void;
  reject: (error: Error) => void;
};

type Outcome = { board: Board } | { error: Error };

type Slot = {
  next: ConfigureMessage | undefined;
  waiters: Settlers[];
};

const roster = new Map<number, RosterEntry>();
const slots = new Map<string, Slot>();
let notifyChange: FleetOptions['onChange'] = () => undefined;
let watchers = 0;
let listingTimer: ReturnType<typeof setInterval> | undefined;

export function startFleet({
  networkInterface,
  onChange,
  onError,
}: FleetOptions): void {
  notifyChange = onChange;
  on('connected', () => {
    notifyChange('fleet');
    startListing();
  });
  on('disconnected', () => {
    stopListing();
    notifyChange('fleet');
  });
  on('error', onError);
  init({ networkInterface });
}

export function getFleet(): Fleet {
  const networkInterface = getNetworkInterface();
  const deviceId = getDeviceId();
  return isConnected() && deviceId !== undefined
    ? { interface: networkInterface, connected: true, deviceId }
    : { interface: networkInterface, connected: false };
}

export function getBoards(): Board[] {
  return [...roster.values()]
    .map(({ status, misses }) => ({ ...status, answering: misses === 0 }))
    .sort((a, b) => a.deviceId - b.deviceId);
}

export function watchBoards(): void {
  watchers += 1;
  if (watchers === 1) {
    startListing();
  }
}

export function unwatchBoards(): void {
  watchers -= 1;
  if (watchers === 0) {
    stopListing();
  }
}

export async function identifyBoard(deviceId: number): Promise<Board> {
  return mergeBoard(await identifyNode(deviceId));
}

// rvl-node resends a value a second after a lost reply; one in flight per
// board and property keeps that resend from landing after a newer value
export function configureBoard(message: ConfigureMessage): Promise<Board> {
  const key = `${message.deviceId}:${message.property}`;
  const slot = slots.get(key);
  return new Promise((resolve, reject) => {
    if (slot !== undefined) {
      slot.next = message;
      slot.waiters.push({ resolve, reject });
      return;
    }
    const opened: Slot = { next: undefined, waiters: [{ resolve, reject }] };
    slots.set(key, opened);
    void drainSlot(key, opened, message);
  });
}

async function drainSlot(
  key: string,
  slot: Slot,
  first: ConfigureMessage
): Promise<void> {
  let outcome: Outcome;
  let current: ConfigureMessage | undefined = first;
  do {
    outcome = await settleConfigure(current);
    current = slot.next;
    slot.next = undefined;
  } while (current !== undefined);
  slots.delete(key);
  for (const { resolve, reject } of slot.waiters) {
    if ('board' in outcome) {
      resolve(outcome.board);
    } else {
      reject(outcome.error);
    }
  }
}

async function settleConfigure({
  deviceId,
  property,
  value,
}: ConfigureMessage): Promise<Outcome> {
  try {
    return {
      board: mergeBoard(await configureNode(deviceId, property, value)),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

function mergeBoard(status: NodeStatus): Board {
  roster.set(status.deviceId, { status, misses: 0 });
  notifyChange('boards');
  return { ...status, answering: true };
}

function startListing(): void {
  if (listingTimer !== undefined || watchers === 0 || !isConnected()) {
    return;
  }
  void listBoards();
  listingTimer = setInterval(() => {
    void listBoards();
  }, LISTING_PERIOD);
}

function stopListing(): void {
  if (listingTimer !== undefined) {
    clearInterval(listingTimer);
    listingTimer = undefined;
  }
}

async function listBoards(): Promise<void> {
  let statuses: NodeStatus[];
  try {
    statuses = await getNodes();
  } catch (error) {
    console.warn('Listing the boards failed:', error);
    return;
  }
  const answered = new Set<number>();
  for (const status of statuses) {
    answered.add(status.deviceId);
    roster.set(status.deviceId, { status, misses: 0 });
  }
  for (const [deviceId, entry] of roster) {
    if (answered.has(deviceId)) {
      continue;
    }
    entry.misses += 1;
    if (entry.misses >= MISSES_BEFORE_DROP) {
      roster.delete(deviceId);
    }
  }
  notifyChange('boards');
}
