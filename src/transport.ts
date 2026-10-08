import { createSocket, type Socket } from 'node:dgram';
import { networkInterfaces } from 'node:os';

import { type AppendBuffer } from './buffer.ts';
import { RVLI_PORT } from './config.ts';
import { emit } from './events.ts';
import { isUsableAddress } from './net.ts';

type InterfaceAddress = {
  address: string;
  netmask: string;
};

type Transport = {
  socket: Socket;
  networkInterface: string;
};

let transport: Transport | undefined;

function getBroadcastAddress({ address, netmask }: InterfaceAddress): string {
  const netmaskOctets = netmask.split('.').map(Number);
  return address
    .split('.')
    .map((octet, i) => Number(octet) | (~netmaskOctets[i] & 0xff))
    .join('.');
}

function parseAddress(address: string): number {
  return address
    .split('.')
    .reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
}

function isOnSubnet(
  address: string,
  { address: own, netmask }: InterfaceAddress
): boolean {
  const mask = parseAddress(netmask);
  return (parseAddress(address) & mask) === (parseAddress(own) & mask);
}

// The socket exists from init() on, so this is what every public function
// checks first
function getTransport(): Transport {
  if (!transport) {
    throw new Error('rvl-node is not initialized yet. Call init()');
  }
  return transport;
}

export function assertInitialized(): void {
  getTransport();
}

export function isInitialized(): boolean {
  return transport !== undefined;
}

export function getNetworkInterface(): string {
  return getTransport().networkInterface;
}

// Creates the socket and starts the bind, which finishes in the background:
// onListening runs once the port is bound, and a failed bind leaves nothing
// running and is reported as an error event, so init() may be tried again
export function bindTransport(
  networkInterface: string,
  onMessage: (message: Buffer, arrivalTime: number) => void,
  onListening: () => void
): void {
  const socket = createSocket({ type: 'udp4' });
  let listening = false;

  socket.on('error', (err) => {
    if (listening) {
      console.error(err);
      return;
    }
    socket.close();
    transport = undefined;
    if ('code' in err && err.code === 'EADDRINUSE') {
      emit(
        'error',
        new Error(
          `UDP port ${RVLI_PORT} is already in use on this host, most ` +
            'likely by another rvl-node process. Running more than one ' +
            'rvl-node instance per host is unsupported, and one instance ' +
            'sends on every channel.',
          { cause: err }
        )
      );
    } else {
      emit('error', err);
    }
  });

  socket.on('message', (message, remote) => {
    // Read first, so the arrival time doesn't include the filtering
    const arrivalTime = performance.now();
    const interfaceAddress = getInterfaceAddress();
    if (interfaceAddress && isOnSubnet(remote.address, interfaceAddress)) {
      onMessage(message, arrivalTime);
    }
  });

  socket.on('listening', () => {
    listening = true;
    socket.setBroadcast(true);
    onListening();
  });

  transport = { socket, networkInterface };
  // The RVLI port on every address, as a board binds it: the clock-sync
  // broadcasts arrive on it, the coordinator replies to it, and each send's
  // subnet broadcast is what picks the interface. RVLA only goes out, so the
  // RVLA port is never bound
  socket.bind(RVLI_PORT);
}

export function getInterfaceAddress(): InterfaceAddress | undefined {
  const bindings = networkInterfaces()[getTransport().networkInterface] ?? [];
  const binding = bindings.find(isUsableAddress);
  if (!binding) {
    return undefined;
  }
  return { address: binding.address, netmask: binding.netmask };
}

// Never rejects, so callers can drop the promise
export function send(packet: AppendBuffer, port: number): Promise<void> {
  const { socket } = getTransport();
  const interfaceAddress = getInterfaceAddress();
  if (!interfaceAddress) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    socket.send(
      packet.toBuffer(),
      port,
      getBroadcastAddress(interfaceAddress),
      (err) => {
        if (err) {
          console.error(err);
        }
        resolve();
      }
    );
  });
}
