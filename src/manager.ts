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
import { RVLController, initController, SendPacket } from './controller';
import { IRVLControllerOptions, ISendPacketMessage, LogLevel } from './types'

const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = LogLevel.Debug;

export const initManager = Symbol();

const getDefaultInterface = Symbol();
const getAddressForInterface = Symbol();
const socket = Symbol();
const serverAddress = Symbol();
const serverPort = Symbol();
const serverNetworkInterface = Symbol();
const channels = Symbol();

export interface IRVLManagerOptions {
  networkInterface?: string;
  port?: number;
}

export class RVLManager {

  private [socket]: Socket;
  private [serverNetworkInterface]: string;
  private [serverAddress]: string;
  private [serverPort]: number;
  private [channels] = new Map<number, RVLController>();

  get networkInterface() {
    return this[serverNetworkInterface];
  }

  get port() {
    return this[serverPort];
  }

  get nodeId() {
    return this[serverAddress];
  }

  constructor({ networkInterface, port = DEFAULT_PORT }: IRVLManagerOptions) {
    if (!networkInterface) {
      networkInterface = this[getDefaultInterface]();
    }
    const address = this[getAddressForInterface](networkInterface);
    this[serverNetworkInterface] = networkInterface;
    this[serverAddress] = address;
    this[serverPort] = port;
  }

  private [getDefaultInterface](): string {
    const interfaces = networkInterfaces();
    let defaultNetworkInterface = '';
    const bestKnownIfacePrefixes = ['eth', 'wlan', 'Wi-Fi', 'Ethernet'];
    for (const iface in interfaces) {
      if (!interfaces.hasOwnProperty(iface)) {
        continue;
      }
      let isEstimate = false;
      for (const estimate of bestKnownIfacePrefixes) {
        if (iface.startsWith(estimate)) {
          isEstimate = true;
          break;
        }
      }
      if (!isEstimate) {
        continue;
      }
      const ips = interfaces[iface].filter((e) => !e.internal && e.family === 'IPv4');
      if (ips.length) {
        defaultNetworkInterface = iface;
        break;
      }
    }
    if (!defaultNetworkInterface) {
      throw new Error('Could not determine the default network inteface. Please supply the interface name explicitly');
    }
    return defaultNetworkInterface;
  }

  private[getAddressForInterface](networkInterface: string): string {
    const interfaces = networkInterfaces();
    const iface = interfaces[networkInterface];
    if (!iface) {
      throw new Error(`Unknown network interface ${networkInterface}. ` +
        `Valid options are ${Object.keys(interfaces).join(', ')}`);
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

  public [initManager](): Promise<void> {
    return new Promise((resolve, reject) => {
      this[socket] = createSocket({
        type: 'udp4',
        reuseAddr: true
      });

      this[socket].on('message', (msg, rinfo) => {
        if (rinfo.port !== this[serverPort] || rinfo.address === this[serverAddress]) {
          return;
        }
        // TODO
      });

      this[socket].on('error', (err) => {
        this[socket].close();
        reject(err);
      });

      this[socket].on('listening', () => {
        this[socket].setBroadcast(true);
        resolve();
      });

      this[socket].on('error', reject);

      this[socket].bind(this[serverPort]);
    });
  }

  public async createController(controllerOptions: IRVLControllerOptions) {
    if (this[channels].has(controllerOptions.channel)) {
      throw new Error(`Channel ${controllerOptions.channel} is already in use`);
    }

    const sendPacket: SendPacket = (message: ISendPacketMessage): void => {
      console.log(message);
      // TODO
      const address = message.destination >= 240 ? `255.255.255.255` : `TODO`
      const payload = Buffer.from(message.payload, 'base64');
      this[socket].send(payload, this[serverPort], address);
    };

    const controller = new RVLController(
      controllerOptions.channel,
      controllerOptions.logLevel || DEFAULT_LOG_LEVEL,
      sendPacket
    );
    this[channels].set(controllerOptions.channel, controller);
    await controller[initController]();
    return controller;
  }
}
