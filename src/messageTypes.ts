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

export interface IRVLControllerOptions {
  networkInterface: string;
  channel: number;
  port?: number;
  logLevel?: 'error' | 'info' | 'debug';
}

export interface IMessage {
  type: string;
}

export interface IInitCompleteMessage extends IMessage {
  type: 'initComplete';
}

export interface ISetWaveParametersMessage extends IMessage {
  type: 'setWaveParameters';
  waveParameters: IWaveParameters;
}

export interface ISetBrightnessMessage extends IMessage {
  type: 'setBrightness';
  brightness: number;
}

export interface ISetPowerStateMessage extends IMessage {
  type: 'setPowerState';
  powerState: boolean;
}
