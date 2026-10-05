import { EventEmitter } from 'node:events';

import { AppendBuffer } from '../buffer.ts';
import {
  ID_REQUEST_TYPE,
  RVLI_PACKET_TYPE_ID_ASSIGNMENT,
  RVLI_PORT,
  RVLI_SIGNATURE,
  RVLI_VERSION,
  UNASSIGNED_DEVICE_ID,
} from '../config.ts';
import { getAvailableInterfaces } from '../net.ts';
import {
  assertInitialized,
  getInterfaceAddress,
  getNetworkInterface,
  send,
} from '../transport.ts';

const IDENTITY_LOOP_INTERVAL = 250;
const ID_RETRY_INTERVAL = 1000;
const ID_RETRY_JITTER = 250;
const ID_WARNING_INTERVAL = 10000;

type IdentityEvents = {
  connected: [];
  disconnected: [];
};

const events = new EventEmitter<IdentityEvents>();

let deviceId: number | undefined;
let nextIdRequestTime = 0;
let idRequested = false;
let lastIdRequestTime = 0;
let lastIdWarningTime = 0;

export function getDeviceId(): number | undefined {
  assertInitialized();
  return deviceId;
}

// The ID is only ever held while the interface has an address, so this
// matches the firmware's isConnected()
export function isConnected(): boolean {
  assertInitialized();
  return deviceId !== undefined;
}

export function on(event: keyof IdentityEvents, listener: () => void): void {
  events.on(event, listener);
}

export function startIdentityProtocol(): void {
  const now = performance.now();
  nextIdRequestTime = now;
  lastIdWarningTime = now;
  runIdentityLoop();
  setInterval(runIdentityLoop, IDENTITY_LOOP_INTERVAL);
}

// A port of the firmware's ProtocolIdentity::loop(), with the interface
// having an IPv4 address standing in for the transport's link state. Only
// whether it has one matters, never which one
function runIdentityLoop(): void {
  const now = performance.now();
  const interfaceAddress = getInterfaceAddress();
  if (!interfaceAddress) {
    if (deviceId !== undefined) {
      deviceId = undefined;
      lastIdWarningTime = now;
      events.emit('disconnected');
    }
    nextIdRequestTime = now;
    idRequested = false;
  } else if (deviceId === undefined && now >= nextIdRequestTime) {
    if (!idRequested) {
      console.info('Requesting device ID');
      idRequested = true;
    }
    lastIdRequestTime = now;
    sendIdRequest();
    nextIdRequestTime =
      now + ID_RETRY_INTERVAL + Math.random() * ID_RETRY_JITTER;
  }

  if (
    deviceId === undefined &&
    now - lastIdWarningTime >= ID_WARNING_INTERVAL
  ) {
    lastIdWarningTime = now;
    if (interfaceAddress) {
      console.warn(
        `No device ID from the coordinator yet. Is ${getNetworkInterface()} ` +
          `(${interfaceAddress.address}) on the fleet's network?`
      );
    } else {
      console.warn(
        `Waiting for ${getNetworkInterface()} to get an IPv4 address. ` +
          `Available interfaces: ${getAvailableInterfaces().join(', ')}`
      );
    }
  }
}

function sendIdRequest(): void {
  const packet = new AppendBuffer();
  packet.appendString(RVLI_SIGNATURE);
  packet.append8(RVLI_VERSION);
  packet.append8(UNASSIGNED_DEVICE_ID);
  packet.append8(RVLI_PACKET_TYPE_ID_ASSIGNMENT);
  packet.append8(0); // Reserved
  packet.append8(ID_REQUEST_TYPE);
  void send(packet, RVLI_PORT);
}

export function handleIdReply(id: number): void {
  if (id === deviceId) {
    return;
  }
  const roundTrip = performance.now() - lastIdRequestTime;
  console.info(
    `Assigned device ID ${id}, ${roundTrip.toFixed(1)} ms after the request`
  );
  const wasConnected = deviceId !== undefined;
  deviceId = id;
  if (!wasConnected) {
    events.emit('connected');
  }
}
