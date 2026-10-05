import { createSocket, type Socket } from 'node:dgram';
import { networkInterfaces } from 'node:os';

import { type AppendBuffer } from './buffer.ts';
import { isUsableAddress } from './net.ts';

type InterfaceAddress = {
  address: string;
  netmask: string;
};

type BoundTransport = {
  socket: Socket;
  networkInterface: string;
};

let transport: BoundTransport | undefined;

function getBroadcastAddress({ address, netmask }: InterfaceAddress): string {
  const netmaskOctets = netmask.split('.').map(Number);
  return address
    .split('.')
    .map((octet, i) => Number(octet) | (~netmaskOctets[i] & 0xff))
    .join('.');
}

// The socket is bound once init() resolves, so this is what every public
// function checks first
function getBoundTransport(): BoundTransport {
  if (!transport) {
    throw new Error(
      'rvl-node is not initialized yet. Call init() and wait for it to resolve'
    );
  }
  return transport;
}

export function assertInitialized(): void {
  getBoundTransport();
}

export function getNetworkInterface(): string {
  return getBoundTransport().networkInterface;
}

export function bindTransport(
  networkInterface: string,
  onMessage: (message: Buffer) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createSocket({ type: 'udp4' });
    let listening = false;

    // Before listening, an error is a failed bind that nothing retries
    socket.on('error', (err) => {
      if (listening) {
        console.error(err);
      } else {
        socket.close();
        reject(err);
      }
    });

    socket.on('message', (message) => {
      onMessage(message);
    });

    socket.on('listening', () => {
      listening = true;
      socket.setBroadcast(true);
      transport = { socket, networkInterface };
      resolve();
    });

    // Every address on an ephemeral port: each send's subnet broadcast is
    // what picks the interface, and the coordinator replies to this port
    socket.bind();
  });
}

export function getInterfaceAddress(): InterfaceAddress | undefined {
  const bindings =
    networkInterfaces()[getBoundTransport().networkInterface] ?? [];
  const binding = bindings.find(isUsableAddress);
  if (!binding) {
    return undefined;
  }
  return { address: binding.address, netmask: binding.netmask };
}

// Never rejects, so callers can drop the promise
export function send(packet: AppendBuffer, port: number): Promise<void> {
  const { socket } = getBoundTransport();
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
