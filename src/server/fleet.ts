import {
  getDeviceId,
  getNetworkInterface,
  getNodes,
  init,
  isConnected,
  type NodeStatus,
  on,
} from 'rvl-node';

import { type Board, type Fleet } from '../common/messages.ts';

const LISTING_PERIOD = 5000;
const MISSES_BEFORE_DROP = 3;

type FleetOptions = {
  networkInterface: string;
  onChange: (what: 'fleet' | 'boards') => void;
  onError: (error: Error) => void;
};

type RosterEntry = { status: NodeStatus; misses: number };

const roster = new Map<number, RosterEntry>();
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
