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

import { LogLevel } from './types';
import { wait } from './util';
import { IWaveParameters } from './animation';
import { addPacketToQueue } from './nodePlatform';

import Module = require('./output');

let cInit: ((logLevel: number, channel: number, deviceId: number) => void) | undefined;

Module.onRuntimeInitialized = () => {
  cInit = Module.cwrap('init', null, ['number', 'number', 'number']);
};

export async function init(logLevel: LogLevel, channel: number, deviceId: number): Promise<void> {
  if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
    throw new Error(`Channel "${channel} is invalid. The channel must be an integer between 0 and 7 (inclusive)`);
  }
  while (!cInit) {
    await wait(10);
  }
  cInit(logLevel, channel, deviceId);
}

export function setWaveParameters(newWaveParameters: IWaveParameters): void {
  // TODO
}

export function setPowerState(newPowerState: boolean): void {
  // TODO
}

export function setBrightness(newBrightness: number): void {
  // TODO
}

export function receivePacket(packet: Buffer): void {
  addPacketToQueue(packet);
}
