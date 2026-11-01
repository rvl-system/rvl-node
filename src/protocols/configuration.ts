import { AppendBuffer } from '../buffer.ts';
import {
  COLOR_ORDERS,
  EVERY_DEVICE_ID,
  MAX_PIXEL_COUNT,
  NICKNAME_LENGTH,
  NUM_CHANNELS,
  NUM_DEVICE_IDS,
  PROPERTIES,
  RVLI_PACKET_TYPE_CONFIGURE,
  RVLI_PACKET_TYPE_IDENTIFY,
  RVLI_PACKET_TYPE_QUERY,
  RVLI_PORT,
} from '../config.ts';
import { send } from '../transport.ts';
import { type NodeConfiguration, type NodeStatus } from '../types.ts';
import { getDeviceId, isConnected } from './identity.ts';
import { writeInfrastructureHeader } from './infrastructure.ts';

// A listing collects for this long, asking twice in case the first query or a
// reply is lost
const QUERY_WINDOW = 1000;
const QUERY_RESEND_DELAY = 250;
// A targeted request waits this long for the node's status, then asks once
// more before giving up: a broadcast is lost a few percent of the time on each
// leg, and a request repeated is the same request
const REPLY_TIMEOUT = 1000;
const ATTEMPTS = 2;

// Whoever is waiting for a status, and which statuses it is waiting for: a
// listing takes every one, and a request takes its node's, matched on the
// value it asked for where there is one, since another request to the same
// node can be in flight at the same time
type Waiter = {
  accepts: (status: NodeStatus) => boolean;
  onStatus: (status: NodeStatus) => void;
};
const waiters = new Set<Waiter>();

export function handleStatus(status: NodeStatus): void {
  for (const waiter of waiters) {
    if (waiter.accepts(status)) {
      waiter.onStatus(status);
    }
  }
}

// A board drops a packet from a source of 255, so this node's ID is what makes
// it a sender
function assertConnected(): number {
  const ownId = getDeviceId();
  if (ownId === undefined || !isConnected()) {
    throw new Error(
      'Not connected to the fleet yet. Wait for the connected event'
    );
  }
  return ownId;
}

function checkDeviceId(deviceId: number): void {
  if (
    !Number.isInteger(deviceId) ||
    deviceId < 0 ||
    deviceId >= NUM_DEVICE_IDS
  ) {
    throw new Error(
      `Device ID must be an integer between 0 and ${NUM_DEVICE_IDS - 1}`
    );
  }
}

function expectNumber(
  property: keyof NodeConfiguration,
  value: number | string,
  min: number,
  max: number
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${property} must be an integer between ${min} and ${max}, got ${value}`
    );
  }
  return value;
}

function appendPropertyValue(
  packet: AppendBuffer,
  property: keyof NodeConfiguration,
  value: number | string
): void {
  switch (property) {
    case 'channel':
      packet.append8(expectNumber(property, value, 0, NUM_CHANNELS - 1));
      break;
    case 'brightness':
    case 'statusLedBrightness':
      packet.append8(expectNumber(property, value, 0, 255));
      break;
    case 'pixelCount':
      packet.append16(expectNumber(property, value, 1, MAX_PIXEL_COUNT));
      break;
    case 'colorOrder': {
      const index = COLOR_ORDERS.findIndex((order) => order === value);
      if (index < 0) {
        throw new Error(
          `colorOrder must be one of ${COLOR_ORDERS.join(', ')}, got ${value}`
        );
      }
      packet.append8(index);
      break;
    }
    case 'nickname': {
      if (
        typeof value !== 'string' ||
        value.length > NICKNAME_LENGTH ||
        !/^[\x20-\x7e]*$/.test(value)
      ) {
        throw new Error(
          `nickname must be up to ${NICKNAME_LENGTH} printable ASCII ` +
            `characters, got ${JSON.stringify(value)}`
        );
      }
      packet.appendString(value);
      for (let i = value.length; i < NICKNAME_LENGTH; i++) {
        packet.append8(0);
      }
      break;
    }
    default:
      throw new Error(`Unknown property ${String(property)}`);
  }
}

function buildRequest(packetType: number, destination: number): AppendBuffer {
  const packet = new AppendBuffer();
  writeInfrastructureHeader(packet, assertConnected(), packetType, destination);
  return packet;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForStatus(
  accepts: (status: NodeStatus) => boolean,
  timeout: number
): Promise<NodeStatus | undefined> {
  return new Promise((resolve) => {
    const waiter: Waiter = {
      accepts,
      onStatus: (status) => {
        clearTimeout(timer);
        waiters.delete(waiter);
        resolve(status);
      },
    };
    const timer = setTimeout(() => {
      waiters.delete(waiter);
      resolve(undefined);
    }, timeout);
    waiters.add(waiter);
  });
}

async function requestStatus(
  deviceId: number,
  packet: AppendBuffer,
  accepts: (status: NodeStatus) => boolean
): Promise<NodeStatus> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    void send(packet, RVLI_PORT);
    const status = await waitForStatus(accepts, REPLY_TIMEOUT);
    if (status) {
      return status;
    }
  }
  throw new Error(`Node ${deviceId} did not answer`);
}

async function collectStatuses(query: AppendBuffer): Promise<NodeStatus[]> {
  const statuses = new Map<number, NodeStatus>();
  const waiter: Waiter = {
    accepts: () => true,
    onStatus: (status) => {
      statuses.set(status.deviceId, status);
    },
  };
  waiters.add(waiter);
  try {
    void send(query, RVLI_PORT);
    await delay(QUERY_RESEND_DELAY);
    void send(query, RVLI_PORT);
    await delay(QUERY_WINDOW - QUERY_RESEND_DELAY);
  } finally {
    waiters.delete(waiter);
  }
  return [...statuses.values()].sort((a, b) => a.deviceId - b.deviceId);
}

// Asks every board to report itself, and resolves a second later with those
// that did, by device ID
export function getNodes(): Promise<NodeStatus[]> {
  return collectStatuses(buildRequest(RVLI_PACKET_TYPE_QUERY, EVERY_DEVICE_ID));
}

// Sets one property on one board, and resolves with the board's status once
// it has applied it: the status that carries the value, or, for a property
// the board doesn't honor, its first status, which shows the property
// unchanged
export function configureNode<P extends keyof NodeConfiguration>(
  deviceId: number,
  property: P,
  value: NodeConfiguration[P]
): Promise<NodeStatus> {
  checkDeviceId(deviceId);
  // Encoded first, so a bad value throws before the connection is looked at
  const valueBytes = new AppendBuffer();
  appendPropertyValue(valueBytes, property, value);
  const packet = buildRequest(RVLI_PACKET_TYPE_CONFIGURE, deviceId);
  packet.append8(PROPERTIES.indexOf(property));
  packet.appendBytes(valueBytes.toBuffer());
  return requestStatus(
    deviceId,
    packet,
    (status) =>
      status.deviceId === deviceId &&
      (!status.capabilities[property] || status[property] === value)
  );
}

// Flashes a board white for five seconds, strip and status LED, and resolves
// with its status
export function identifyNode(deviceId: number): Promise<NodeStatus> {
  checkDeviceId(deviceId);
  return requestStatus(
    deviceId,
    buildRequest(RVLI_PACKET_TYPE_IDENTIFY, deviceId),
    (status) => status.deviceId === deviceId
  );
}
