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

import { IWaveParameters } from './animation';

export * from './animation';

const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = 'debug';

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;

export interface IRVLControllerOptions {
  networkInterface: string;
  channel: number;
  port?: number;
  logLevel?: 'error' | 'info' | 'debug';
}

const channelsInUse = new Set<number>();

const isInitialized = Symbol();
const options = Symbol();
const waveParameters = Symbol();
const brightness = Symbol();
const powerState = Symbol();

export class RVLController {
  private [isInitialized] = false;
  private [waveParameters]: IWaveParameters;
  private [brightness] = 0;
  private [powerState] = false;
  private [options]: IRVLControllerOptions;

  public get waveParameters() {
    return this[waveParameters];
  }

  public get animationTime() {
    // TODO
    return 0;
  }

  public get powerState() {
    return this[powerState];
  }

  public get brightness() {
    return this[brightness];
  }

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
    // TODO
  }

  public async init(): Promise<void> {
    // TODO
    this[isInitialized] = true;
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
    // TODO
    this[waveParameters] = newWaveParameters;
  }

  public setPowerState(newPowerState: boolean): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setPowerState" before calling "init"');
    }
    // TODO
    this[powerState] = newPowerState;
  }

  public setBrightness(newBrightness: number): void {
    if (!this[isInitialized]) {
      throw new Error('Cannot call "setBrightness" before calling "init"');
    }
    // TODO
    this[brightness] = newBrightness;
  }
}
