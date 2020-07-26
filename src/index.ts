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
import { Worker } from 'worker_threads';
import { IWaveParameters } from './animation';
import { IMessage, ISetWaveParametersMessage, ISetBrightnessMessage, ISetPowerStateMessage } from './messageTypes';
import { IRVLControllerOptions } from './messageTypes';

export * from './animation';
export { IRVLControllerOptions } from './messageTypes';

const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = 'debug';

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;

const channelsInUse = new Set<number>();

const isInitialized = Symbol();
const options = Symbol();
const rvlWorker = Symbol();

export class RVLController {
  private [isInitialized] = false;
  private [options]: IRVLControllerOptions;
  private [rvlWorker]: Worker;

  constructor({
    networkInterface,
    channel,
    port = DEFAULT_PORT,
    logLevel = DEFAULT_LOG_LEVEL
  }: IRVLControllerOptions) {
    if (channelsInUse.has(channel)) {
      throw new Error(`Channel ${channel} is already in use`);
    }
    channelsInUse.add(channel);
    this[options] = { networkInterface, channel, port, logLevel };
  }

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this[rvlWorker] = new Worker(join(__dirname, 'worker.js'), {
        workerData: this[options]
      });

      this[rvlWorker].on('error', reject);

      this[rvlWorker].on('exit', (code) => {
        throw new Error(`Internal Error: worker thread unexpectedly quit with code ${code}`);
      });

      this[rvlWorker].on('message', (message: IMessage) => {
        console.log(message);
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
            default:
              throw new Error(`Internal Error: received unknown worker thread "${message.type}" message`);
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
    channelsInUse.delete(this[options].channel);
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
    this[rvlWorker].postMessage(message);
  }

  public setPowerState(newPowerState: boolean): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setPowerState" before calling "init"');
    }
    const message: ISetPowerStateMessage = {
      type: 'setPowerState',
      powerState: newPowerState
    };
    this[rvlWorker].postMessage(message);
  }

  public setBrightness(newBrightness: number): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setBrightness" before calling "init"');
    }
    const message: ISetBrightnessMessage = {
      type: 'setBrightness',
      brightness: newBrightness
    };
    this[rvlWorker].postMessage(message);
  }
}
