import {
  getDeviceId,
  getNetworkInterface,
  getNodes,
  init,
  isConnected,
  type NodeStatus,
  on,
} from 'rvl-node';

import { type Column, type Fleet } from '../common/messages.ts';

const LISTING_PERIOD = 5000;
const MISSES_BEFORE_DROP = 3;

type FleetOptions = {
  networkInterface: string;
  onChange: (what: 'fleet' | 'columns') => void;
  onError: (error: Error) => void;
};

type RosterEntry = { status: NodeStatus; misses: number };

const roster = new Map<number, RosterEntry>();
let columns: Column[] = [];
let notifyChange: FleetOptions['onChange'] = () => undefined;
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

export function getColumns(): Column[] {
  return columns;
}

// With or without a page open: the columns follow the boards either way
function startListing(): void {
  if (listingTimer !== undefined) {
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

// One per channel, from the board with the lowest device ID on it
function buildColumns(): Column[] {
  const boards = new Map<number, NodeStatus>();
  for (const { status } of roster.values()) {
    const held = boards.get(status.channel);
    if (held === undefined || status.deviceId < held.deviceId) {
      boards.set(status.channel, status);
    }
  }
  return [...boards.values()]
    .map(({ channel, pixelCount }) => ({ channel, pixelCount }))
    .sort((a, b) => a.channel - b.channel);
}

function haveSameColumns(a: Column[], b: Column[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (column, index) =>
        column.channel === b[index].channel &&
        column.pixelCount === b[index].pixelCount
    )
  );
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
  const listed = buildColumns();
  if (!haveSameColumns(listed, columns)) {
    columns = listed;
    notifyChange('columns');
  }
}
