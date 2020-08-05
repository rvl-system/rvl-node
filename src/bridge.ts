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

import { readFileSync } from 'fs';
import { join } from 'path';
import { LogLevel } from './types';
import { wait } from './util';
import { IWaveParameters } from './animation';
import { addPacketToQueue } from './nodePlatform';

import Module = require('./output');

interface IStructInfoEntry {
  name: string;
  path: string[];
  type: 'uint8_t' | 'int8_t' | 'uint16_t' | 'int16_t' | 'uint32_t' | 'int32_t';
  initialValue: number;
  size: number;
  index: number;
}

interface IStructInfo {
  totalSize: number;
  entryDictionary: { [entryName: string]: IStructInfoEntry };
}

const structData: IStructInfo = JSON.parse(readFileSync(join(__dirname, 'structInfo.json')).toString());
const pathSegmentArrayRegex = /^(.*?)\[([0-9]*)\]$/;
for (const entryName in structData.entryDictionary) {
  if (!structData.entryDictionary.hasOwnProperty(entryName)) {
    continue;
  }
  const entry = structData.entryDictionary[entryName];
  const entryPath = entry.name.split('.');
  for (let i = entryPath.length - 1; i >= 0; i--) {
    const match = pathSegmentArrayRegex.exec(entryPath[i]);
    if (match) {
      entryPath.splice(i, 1, match[1], match[2]);
    }
  }
  entry.path = entryPath;
}

let cInit: ((logLevel: number, channel: number, deviceId: number) => void) | undefined;
let cGetWaveSettingsPointer: (() => number) | undefined;
let cUpdateWaveSettings: (() => void) | undefined;

Module.onRuntimeInitialized = () => {
  cInit = Module.cwrap('init', null, ['number', 'number', 'number']);
  cGetWaveSettingsPointer = Module.cwrap('getWaveSettingsPointer', 'number', []);
  cUpdateWaveSettings = Module.cwrap('updateWaveSettings', null, []);
};

export async function init(logLevel: LogLevel, channel: number, deviceId: number): Promise<void> {
  if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
    throw new Error(`Channel "${channel} is invalid. The channel must be an integer between 0 and 7 (inclusive)`);
  }
  while (!cInit || !cGetWaveSettingsPointer || !cUpdateWaveSettings) {
    await wait(10);
  }
  cInit(logLevel, channel, deviceId);
}

export function setWaveParameters(newWaveParameters: IWaveParameters): void {
  if (!cGetWaveSettingsPointer) {
    throw new Error(`Internal Error: cGetWaveSettingsPointer is unexpectedly null`);
  }
  if (!cUpdateWaveSettings) {
    throw new Error(`Internal Error: cGetWaveSettingsPointer is unexpectedly null`);
  }
  const waveSettingsPointer = cGetWaveSettingsPointer();
  const waveSettingsBuffer = Module.HEAPU8.subarray(waveSettingsPointer, waveSettingsPointer + structData.totalSize);
  const view = Buffer.from(waveSettingsBuffer.buffer, waveSettingsPointer, structData.totalSize);

  function writeValue(path: string, value: any) {
    if (typeof value === 'number') {
      const structEntry = structData.entryDictionary[path];
      if (!structEntry) {
        throw new Error(`Internal Error: Uknown struct path "${path}"`);
      }
      switch (structEntry.type) {
        case 'uint8_t':
          view.writeUInt8(value, structEntry.index);
          break;
        case 'int8_t':
          view.writeInt8(value, structEntry.index);
          break;
        case 'uint16_t':
          view.writeUInt16BE(value, structEntry.index);
          break;
        case 'int16_t':
          view.writeInt16BE(value, structEntry.index);
          break;
        case 'uint32_t':
          view.writeUInt32BE(value, structEntry.index);
          break;
        case 'int32_t':
          view.writeInt32BE(value, structEntry.index);
          break;
        default:
          throw new Error(`Internal Error: Encountered unexpected struct type "${structEntry.type}"`);
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        writeValue(`${path}[${i}]`, value[i]);
      }
    } else if (typeof value === 'object') {
      for (const entry in value) {
        if (!value.hasOwnProperty(entry)) {
          continue;
        }
        writeValue(`${path}.${entry}`, value[entry]);
      }
    } else {
      throw new Error(`Internal Error: Unsupported value type `);
    }
  }
  for (const param in newWaveParameters) {
    if (!newWaveParameters.hasOwnProperty(param)) {
      continue;
    }
    writeValue(param, (newWaveParameters as any)[param]);
  }

  cUpdateWaveSettings();
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
