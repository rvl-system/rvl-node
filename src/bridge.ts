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

import Module = require('./output');

const UPDATE_RATE = 33;

let cInit: ((logLevel: number, channel: number) => void) | undefined;
let cLoop: (() => void) | undefined;

Module.onRuntimeInitialized = () => {
  cInit = Module.cwrap('init', null, ['number', 'number']);
  cLoop = Module.cwrap('loop', null, []);
};

export async function init(logLevel: LogLevel, channel: number) {
  if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
    throw new Error(`Channel "${channel} is invalid. The channel must be an integer between 0 and 7 (inclusive)`);
  }
  while (!cInit || !cLoop) {
    await wait(10);
  }
  cInit(logLevel, channel);
  setImmediate(loop);
}

function loop() {
  if (!cLoop) {
    throw new Error(`Internal Error: cLoop is unepexctedly undefined`);
  }

  // Run one iteration of the loop
  const loopStartTime = process.hrtime.bigint();
  cLoop();
  const now = process.hrtime.bigint();

  // Calculate how long until we should run the loop again, and run it then
  const timeConsumed = Number((now - loopStartTime) / 1000000n);
  if (timeConsumed > UPDATE_RATE) {
    console.log(`[Warn ]: system loop took ${timeConsumed - UPDATE_RATE}ms longer than the update rate`);
    setImmediate(loop);
  } else {
    setTimeout(loop, UPDATE_RATE - timeConsumed);
  }
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
  // TODO
}
