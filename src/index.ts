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

import { join } from 'path';
import { fork, ChildProcess } from 'child_process';
import { networkInterfaces } from 'os';
import { createSocket, Socket } from 'dgram';
import { IWaveParameters } from './animation';
import {
  IRVLControllerOptions,
  LogLevel,
  IMessage,
  ISetWaveParametersMessage,
  ISetBrightnessMessage,
  ISetPowerStateMessage,
  ISendPacketMessage
} from './types';

export * from './animation';
export { IRVLControllerOptions, LogLevel } from './types';

const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = LogLevel.Debug;

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;

const channels = new Map<number, RVLController>();
let socket: Socket;

const isInitialized = Symbol();
const options = Symbol();
const rvlWorker = Symbol();
const init = Symbol();

export interface IInitOptions {
  networkInterface?: string;
  port?: number;
}

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

export interface IRVL {
  readonly networkInterface: string;
  readonly port: number;
  readonly nodeId: number;
  createController(controllerOptions: IRVLControllerOptions): Promise<RVLController>;
}

export async function createRvl(initOptions: IInitOptions = {}): Promise<IRVL> {
  initOptions = initOptions || {};
  const networkInterface = initOptions.networkInterface || defaultNetworkInterface;
  const port = initOptions.port || DEFAULT_PORT;
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

  return new Promise((resolve, reject) => {
    socket = createSocket({
      type: 'udp4',
      reuseAddr: true
    });

    socket.on('message', (msg, rinfo) => {
      // if (rinfo.port !== port || rinfo.address === address) {
      //   return;
      // }
      // readBuffers.push(msg);
      // TODO
    });

    socket.on('error', (err) => {
      console.error(err);
      socket.close();
    });

    socket.on('listening', () => {
      socket.setBroadcast(true);
      resolve({
        async createController(controllerOptions: IRVLControllerOptions) {
          if (channels.has(controllerOptions.channel)) {
            throw new Error(`Channel ${controllerOptions.channel} is already in use`);
          }
          const controller = new RVLController(controllerOptions);
          channels.set(controllerOptions.channel, controller);
          await controller[init]();
          return controller;
        },
        get networkInterface() {
          return networkInterface;
        },
        get port() {
          return port;
        },
        get nodeId() {
          return address ? parseInt(address.split('.')[3], 10) : 0;
        }
      });
    });

    socket.on('error', reject);

    socket.bind(port);
  });
}

class RVLController {
  private [isInitialized] = false;
  private [options]: IRVLControllerOptions;
  private [rvlWorker]: ChildProcess;

  constructor({
    channel,
    logLevel = DEFAULT_LOG_LEVEL
  }: IRVLControllerOptions) {
    this[options] = { channel, logLevel };
  }

  public [init](): Promise<void> {
    return new Promise((resolve, reject) => {
      this[rvlWorker] = fork(join(__dirname, 'worker.js'), [ JSON.stringify(this[options]) ]);

      this[rvlWorker].on('error', reject);

      this[rvlWorker].on('exit', (code) => {
        throw new Error(`Internal Error: worker thread unexpectedly quit with code ${code}`);
      });

      this[rvlWorker].on('message', (message: IMessage) => {
        if (!this[isInitialized]) {
          if (message.type === 'initComplete') {
            this[isInitialized] = true;
            resolve();
          } else {
            throw new Error(
              `Internal Error: received worker thread "${message.type}" message before receiving "initComplete" message`
            );
          }
        } else {
          switch (message.type) {
            case 'sendPacket':
              console.log(message as ISendPacketMessage);
              // TODO
              break;
            default:
              throw new Error(`Internal Error: received unknown message type "${message.type}" from child process`);
          }
        }
      });
    });
  }

  public async close(): Promise<void> {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "close" before calling "init"');
    }
    // TODO
    this[isInitialized] = false;
    channels.delete(this[options].channel);
  }

  public setWaveParameters(newWaveParameters: IWaveParameters): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setWaveParameters" before calling "init"');
    }
    if (newWaveParameters.waves.length > MAX_NUM_WAVES) {
      throw new Error(`Only ${MAX_NUM_WAVES} waves max are supported`);
    }
    if (typeof newWaveParameters.timePeriod !== 'number') {
      newWaveParameters.timePeriod = DEFAULT_TIME_PERIOD;
    }
    if (typeof newWaveParameters.distancePeriod !== 'number') {
      newWaveParameters.timePeriod = DEFAULT_DISTANCE_PERIOD;
    }
    const message: ISetWaveParametersMessage = {
      type: 'setWaveParameters',
      waveParameters: newWaveParameters
    };
    this[rvlWorker].send(message);
  }

  public setPowerState(newPowerState: boolean): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setPowerState" before calling "init"');
    }
    const message: ISetPowerStateMessage = {
      type: 'setPowerState',
      powerState: newPowerState
    };
    this[rvlWorker].send(message);
  }

  public setBrightness(newBrightness: number): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setBrightness" before calling "init"');
    }
    const message: ISetBrightnessMessage = {
      type: 'setBrightness',
      brightness: newBrightness
    };
    this[rvlWorker].send(message);
  }
}
