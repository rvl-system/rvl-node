/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Messaging.

Raver Lights Messaging is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Messaging is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Messaging.  If not, see <http://www.gnu.org/licenses/>.
*/

import { readFile } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';

import { asmGlobalArg, asmLibraryArg, memoryBase, tableBase, tableInitial, tableMaximum } from './output';

export interface IWaveChannel {
  a: number; // Default 0
  b: number; // Default 0
  w_t: number; // Default 0
  w_x: number; // Default 0
  phi: number; // Default 0
}

export interface IWave {
  h: IWaveChannel;
  s: IWaveChannel;
  v: IWaveChannel;
  a: IWaveChannel;
}

export interface IWaveParameters {
  timePeriod?: number; // Default 255
  distancePeriod?: number; // Default 32
  waves: IWave[];
}

const startTime = process.hrtime.bigint() / 1000000n;
let wasmExports: WebAssembly.ResultObject | undefined;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });

function memoryToString(ptr: number, len: number): string {
  const view = new Uint8Array(memory.buffer, ptr, len);
  let string = '';
  for (let i = 0; i < len; i++) {
    string += String.fromCharCode(view[i]);
  }
  return string;
}

function handlePrintChar(charCode: number) {
  process.stdout.write(String.fromCharCode(charCode));
}

function handlePrintlnChar(charCode: number) {
  process.stdout.write(String.fromCharCode(charCode) + '\n');
}

function handlePrintString(ptr: number, len: number) {
  if (len > 0) {
    process.stdout.write(memoryToString(ptr, len));
  }
}

function handlePrintlnString(ptr: any, len: number) {
  if (len > 0) {
    process.stdout.write(memoryToString(ptr, len) + '\n');
  } else {
    process.stdout.write('\n');
  }
}

function handleGetRelativeTime(): number {
  return Math.round(Number(process.hrtime.bigint() / 1000000n - startTime));
}

function handleGetDeviceId(): number {
  const interfaces = networkInterfaces();
  for (const interfaceId in interfaces) {
    if (!interfaceId.startsWith('wlan') && !interfaceId.startsWith('wifi')) {
      continue;
    }
    const interfaceAddresses = interfaces[interfaceId]
      .filter((iface) => iface.family === 'IPv4')
      .filter((iface) => iface.address.startsWith('192.168.1.'));
    if (interfaceAddresses.length) {
      // TODO: this is haaaaacky!
      const address = interfaceAddresses[0].address;
      const deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
      return deviceId;
    }
  }
  throw new Error('Could not find a suitable IP address for the device ID');
}

export function init(cb: (err?: Error) => void) {
  readFile(join(__dirname, 'output.wasm'), (readErr, buf) => {
    if (readErr) {
      cb(readErr);
      return;
    }
    const bytes = new Uint8Array(buf);
    const env = {
      ...asmLibraryArg,
      table: new WebAssembly.Table({
        initial: tableInitial,
        maximum: tableMaximum,
        element: 'anyfunc'
      }),
      __table_base: tableBase,
      memory,
      __memory_base: memoryBase,
      STACKTOP: 0,
      STACK_MAX: memory.buffer.byteLength,

      _jsPrintChar: handlePrintChar,
      _jsPrintString: handlePrintString,
      _jsPrintlnChar: handlePrintlnChar,
      _jsPrintlnString: handlePrintlnString,
      _jsGetRelativeTime: handleGetRelativeTime,
      _jsGetDeviceId: handleGetDeviceId
    };
    const global = {
      ...asmGlobalArg
    };
    WebAssembly.instantiate(bytes, { env, global })
      .then((result) => {
        wasmExports = result;
        wasmExports.instance.exports._init();
        setImmediate(() => cb());
      })
      .catch((err) => setImmediate(() => cb(err)));
  });
}

export function start(): void {
  if (!wasmExports) {
    throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
  }
  wasmExports.instance.exports._loop();
  // console.log(wasmExports.instance.exports._add(9, 9));
  // TODO
}

export function stop(): void {
  if (!wasmExports) {
    throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
  }
  // TODO
}

export function setWaveParameters(params: IWaveParameters): void {
  if (!wasmExports) {
    throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
  }
  if (typeof params.distancePeriod === 'undefined') {
    params.distancePeriod = 255;
  }
  if (typeof params.timePeriod === 'undefined') {
    params.timePeriod = 32;
  }
  wasmExports.instance.exports._setWaveParameters();
 // TODO
}
