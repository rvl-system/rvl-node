import { createSocket, type Socket } from 'node:dgram';
import { networkInterfaces } from 'node:os';

import { getAvailableInterfaces, getDefaultInterface } from './net.js';
import { type RVLManagerOptions, type WaveParameters } from './types.js';

const DEFAULT_PORT = 4978;

// Private and friend class properties
export const initManager = Symbol();

let id = 0;

export class RVLManager {
  #socket: Socket | undefined;
  #serverNetworkInterface: string;
  #serverAddress: string;
  #serverPort: number;
  #serverDeviceId: number;

  get networkInterface() {
    return this.#serverNetworkInterface;
  }
  get address() {
    return this.#serverAddress;
  }

  get port() {
    return this.#serverPort;
  }

  get deviceId() {
    return this.#serverDeviceId;
  }

  constructor({
    networkInterface,
    port = DEFAULT_PORT,
  }: RVLManagerOptions = {}) {
    if (!networkInterface) {
      networkInterface = getDefaultInterface();
      if (!networkInterface) {
        throw new Error(
          'Could not determine a usable default network interface'
        );
      }
    }
    const address = this.#getAddressForInterface(networkInterface);
    this.#serverNetworkInterface = networkInterface;
    this.#serverAddress = address;
    const addressOctets = this.#serverAddress.split('.');
    if (addressOctets.length !== 4) {
      throw new Error(`Internal Error: could not parse server IP address`);
    }
    this.#serverDeviceId = parseInt(addressOctets[3], 10);
    this.#serverPort = port;
  }

  public [initManager](): Promise<void> {
    return new Promise((resolve) => {
      this.#socket = createSocket({
        type: 'udp4',
        reuseAddr: true,
      });

      this.#socket.on('error', (err) => {
        console.error(err);
        this.#socket?.close();
      });

      this.#socket.bind(this.#serverPort, this.#serverAddress);
      this.#socket.on('listening', () => {
        if (!this.#socket) {
          throw new Error(
            'Internal Error: this[socket] is unexpectedly undefined. This is a bug'
          );
        }
        this.#socket.setBroadcast(true);
        resolve();
      });

      // Send reference broadcast packets at a regular interval
      setInterval(() => {
        this.#sendReferenceBroadcast({ isFirst: true });
        setTimeout(() => {
          this.#sendReferenceBroadcast({ isFirst: false });
          setTimeout(() => {
            this.#sendReferenceBroadcast({ isFirst: false });
          }, 100);
        }, 100);
      }, 2000);
    });
  }

  public setWaveParameters(channel: number, parameters: WaveParameters) {
    // TODO
  }

  public setPowerState(channel: number, newPowerState: boolean): void {
    // TODO
  }

  public setBrightness(channel: number, newBrightness: number): void {
    // TODO
  }

  #send(message: Buffer, channel?: number) {
    if (!this.#socket) {
      throw new Error(
        'Internal Error: this.#socket is unexpectedly undefined. This is a bug'
      );
    }
    const address = `255.255.255.${String(channel ?? 255)}`;
    this.#socket.send(message, this.#serverPort, address);
  }

  #sendReferenceBroadcast({ isFirst }: { isFirst: boolean }) {
    if (!this.#socket) {
      throw new Error(
        'Internal Error: this.#socket is unexpectedly undefined. This is a bug'
      );
    }
    const payload = Buffer.alloc(16);

    // Header
    payload.write('RVLX', 'ascii');
    payload.writeUInt8(1); // Protocol version
    payload.writeUInt8(255); // Broadcast
    payload.writeUInt8(this.#serverDeviceId);
    payload.writeUInt8(3); // Clock sync packet type

    // Payload
    payload.writeUInt8(1); // Reference broadcast
    payload.writeUint16LE(id++);
    payload.writeUint8(0); // Reserved
    payload.writeUint8(isFirst ? 1 : 0);
    payload.writeUint8(0); // Reserved

    this.#send(payload);
  }

  #getAddressForInterface(networkInterface: string): string {
    const interfaces = networkInterfaces();
    const iface = interfaces[networkInterface];
    if (!iface) {
      throw new Error(
        `Unknown network interface ${networkInterface}. ` +
          `Valid options are ${Object.keys(getAvailableInterfaces()).join(', ')}`
      );
    }
    let address: string | undefined;
    for (const binding of iface) {
      if (binding.family === 'IPv4') {
        address = binding.address;
        break;
      }
    }
    if (!address) {
      throw new Error(
        `Could not find an IPv4 address for interface "${networkInterface}"`
      );
    }
    return address;
  }
}
