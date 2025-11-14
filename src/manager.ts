/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

RVL Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RVL Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with RVL Node.  If not, see <http://www.gnu.org/licenses/>.
*/

import { createSocket, Socket } from 'dgram';
import { networkInterfaces } from 'os';
import { RVLController, initController, processPacket, SendPacket } from './controller';
import { IRVLControllerOptions, ISendPacketMessage, LogLevel } from './types';

const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = LogLevel.Debug;
const CHANNEL_OFFSET = 240;

const VALID_INTERFACE_PREFIXES = ['en', 'eth', 'wlan', 'Wi-Fi', 'Ethernet'];

// Private and friend class properties
export const initManager = Symbol();
const getAddressForInterface = Symbol();
const socket = Symbol();
const serverAddress = Symbol();
const serverDeviceId = Symbol();
const serverPort = Symbol();
const serverNetworkInterface = Symbol();
const channels = Symbol();

export interface IRVLManagerOptions {
  networkInterface?: string;
  port?: number;
}

export function getAvailableInterfaces(): string[] {
  const interfaces = networkInterfaces();
  const validInterfaces: string[] = [];
  for (const ifaceName in interfaces) {
    if (!interfaces.hasOwnProperty(ifaceName)) {
      continue;
    }
    let isEstimate = false;
    for (const estimate of VALID_INTERFACE_PREFIXES) {
      if (ifaceName.startsWith(estimate)) {
        isEstimate = true;
        break;
      }
    }
    const iface = interfaces[ifaceName];
    if (!iface) {
      throw new Error('Internal Error: iface is unexepctedly undefined. This is a bug');
    }
    if (!isEstimate) {
      continue;
    }
    const ips = iface.filter((e) => !e.internal && e.family === 'IPv4');
    if (ips.length) {
      validInterfaces.push(ifaceName);
    }
  }
  return validInterfaces;
}

export function getDefaultInterface(): string | undefined {
  return getAvailableInterfaces()[0];
}

let id = 0;

export class RVLManager {

  private [socket]: Socket | undefined;
  private [serverNetworkInterface]: string;
  private [serverAddress]: string;
  private [serverPort]: number;
  private [channels] = new Map<number, RVLController>();
  private [serverDeviceId]: number;

  get networkInterface() {
    return this[serverNetworkInterface];
  }
  get address() {
    return this[serverAddress];
  }

  get port() {
    return this[serverPort];
  }

  get deviceId() {
    return this[serverDeviceId];
  }

  constructor({ networkInterface, port = DEFAULT_PORT }: IRVLManagerOptions = {}) {
    if (!networkInterface) {
      networkInterface = getDefaultInterface();
      if (!networkInterface) {
        throw new Error('Could not determine a usable default network interface');
      }
    }
    const address = this[getAddressForInterface](networkInterface);
    this[serverNetworkInterface] = networkInterface;
    this[serverAddress] = address;
    const addressOctets = this[serverAddress].split('.');
    if (addressOctets.length !== 4) {
      throw new Error(`Internal Error: could not parse server IP address`);
    }
    this[serverDeviceId] = parseInt(addressOctets[3], 10);
    this[serverPort] = port;

    // Send reference broadcast packets at a regular interval
    setInterval(() => this.sendReferenceBroadcast, 2000)
  }

  private async sendReferenceBroadcast() {
    if (!this[socket]) {
      return;
    }

    for (let i = 0; i < 3; i++) {
      const payload = Buffer.alloc(16);

      // Header
      payload.writeUInt8('R'.charCodeAt(0));
      payload.writeUInt8('V'.charCodeAt(0));
      payload.writeUInt8('L'.charCodeAt(0));
      payload.writeUInt8('X'.charCodeAt(0));
      payload.writeUInt8(1); // Protocol version
      payload.writeUInt8(255); // Broadcast
      payload.writeUInt8(this[serverDeviceId]);
      payload.writeUInt8(3); // Clock sync packet type

      // Payload
      payload.writeUInt8(1); // Reference broadcast
      payload.writeUint16LE(id++);
      payload.writeUint8(0); // Reserved
      payload.writeUint8(i === 0 ? 1 : 0);
      payload.writeUint8(0); // Reserved

      this[socket].send(payload, this[serverPort], '255.255.255.255');

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  public [initManager](): Promise<void> {
    return new Promise((resolve, reject) => {
      this[socket] = createSocket({
        type: 'udp4',
        reuseAddr: true
      });

      const header = Buffer.from('RVLX', 'ascii');
      this[socket].on('message', (message, rinfo) => {
        if (rinfo.port !== this[serverPort] || rinfo.address === this[serverAddress]) {
          return;
        }

        // Check if this is an RVL packet
        if (header.compare(message, 0, 4) === 0) {
          if (message[4] !== 1) {
            console.warn(`[warn ]: Received unsupported RVL packet version ${message[4]}`);
            return;
          }
          // Peek at the header to do some pre-processing
          const destination = message[5];
          const source = message[6];
          const channel = message[8];

          // Ignore our own packets
          if (source === this[serverDeviceId]) {
            return;
          }

          // Ignore unicast packets meant for a different destination
          if (destination < CHANNEL_OFFSET && destination !== this[serverDeviceId]) {
            return;
          }

          // If this is a unicast or multicast packet, send it to that controller only
          if (destination < 255) {
            const controller = this[channels].get(channel);

            // If we don't have an active controller, that probably means this
            // packet was meant for a controller on a different device
            if (!controller) {
              return;
            }

            controller[processPacket](message);
          }

          // If this is a broadcast packet, send it to all controllers
          if (destination === 255) {
            for (const [, controller] of this[channels].entries()) {
              controller[processPacket](message);
            }
          }
        }
      });

      this[socket].on('error', (err) => {
        if (!this[socket]) {
          throw new Error('Internal Error: this[socket] is unexpectedly undefined. This is a bug');
        }
        this[socket].close();
        reject(err);
      });

      this[socket].on('listening', () => {
        if (!this[socket]) {
          throw new Error('Internal Error: this[socket] is unexpectedly undefined. This is a bug');
        }
        this[socket].setBroadcast(true);
        resolve();
      });

      this[socket].on('error', reject);

      this[socket].bind(this[serverPort], this[serverAddress]);
    });
  }

  public async createController(controllerOptions: IRVLControllerOptions) {
    if (this[channels].has(controllerOptions.channel)) {
      throw new Error(`Channel ${controllerOptions.channel} is already in use`);
    }

    const sendPacket: SendPacket = (message: ISendPacketMessage): void => {
      if (!this[socket]) {
        throw new Error('Internal Error: this[socket] is unexpectedly undefined. This is a bug');
      }
      let address = '';
      if (message.destination >= 240) {
        address = '255.255.255.255';
      } else {
        const addressOctets = this[serverAddress].split('.');
        addressOctets[3] = message.destination.toString();
        address = addressOctets.join('.');
      }
      const payload = Buffer.from(message.payload, 'base64');
      this[socket].send(payload, this[serverPort], address);
    };

    const controller = new RVLController(
      controllerOptions.channel,
      controllerOptions.logLevel || DEFAULT_LOG_LEVEL,
      this[serverDeviceId],
      sendPacket
    );
    this[channels].set(controllerOptions.channel, controller);
    await controller[initController]();
    return controller;
  }

  private [getAddressForInterface](networkInterface: string): string {
    const interfaces = networkInterfaces();
    const iface = interfaces[networkInterface];
    if (!iface) {
      throw new Error(`Unknown network interface ${networkInterface}. ` +
        `Valid options are ${Object.keys(getAvailableInterfaces()).join(', ')}`);
    }
    let address: string | undefined;
    for (const binding of iface) {
      if (binding.family === 'IPv4') {
        address = binding.address;
        break;
      }
    }
    if (!address) {
      throw new Error(`Could not find an IPv4 address for interface "${networkInterface}"`);
    }
    return address;
  }
}
