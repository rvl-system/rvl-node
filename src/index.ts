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
import { createSocket, Socket } from 'dgram';

import { asmGlobalArg, asmLibraryArg, memoryBase, tableBase, tableInitial, tableMaximum } from './output';

const SERVER_PORT = 4978;

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

let wasmExports: WebAssembly.ResultObject | undefined;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });

// Logging implementation methods

function memoryToString(ptr: number, len: number): string {
  const view = new Uint8Array(memory.buffer, ptr, len);
  let string = '';
  for (let i = 0; i < len; i++) {
    string += String.fromCharCode(view[i]);
  }
  return string;
}

function handlePrintString(ptr: number, len: number) {
  if (len > 0) {
    process.stdout.write(memoryToString(ptr, len));
  }
}

function handlePrintlnString(ptr: number, len: number) {
  if (len > 0) {
    process.stdout.write(memoryToString(ptr, len) + '\n');
  } else {
    process.stdout.write('\n');
  }
}

// Platform implementation methods

const startTime = process.hrtime.bigint() / 1000000n;
let deviceId = 0;

function handleGetRelativeTime(): number {
  return Math.round(Number(process.hrtime.bigint() / 1000000n - startTime));
}

function handleGetDeviceId(): number {
  return deviceId;
}

// Transport implementation methods

let socket: Socket;
let broadcastAddress: string;
let writeBuffer: number[] = [];

function handleBeginWrite(): void {
  writeBuffer = [];
}

function handleWrite8(val: number): void {
  writeBuffer.push(val);
}

function handleWrite16(val: number): void {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUInt16BE(val, 0);
  writeBuffer.push(buf[0], buf[1]);
}

function handleWrite32(val: number): void {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(val, 0);
  writeBuffer.push(buf[0], buf[1], buf[2], buf[3]);
}

function handleWriteBuffer(ptr: number, len: number): void {
  const data = new Uint8Array(memory.buffer, ptr, len);
  writeBuffer.push(...Array.from(data));
}

function handleEndWrite(): void {
  socket.send(Buffer.from(writeBuffer), SERVER_PORT, broadcastAddress);
  writeBuffer = [];
}

function handleParsePacket(): number {
  return 16;
}

function handleRead8(): number {
  return 8;
}

function handleRead16(): number {
  return 16;
}

function handleRead32(): number {
  return 32;
}

function handleRead(ptr: number, len: number): void {
  const view = new Uint8Array(memory.buffer, ptr, len);
  for (let i = 0; i < len; i++) {
    view[i] = i + 2;
  }
}

export function init(ifaceName: string, cb: (err?: Error) => void) {
  const interfaces = networkInterfaces();
  const iface = interfaces[ifaceName];
  if (!iface) {
    throw new Error(`Unknown network interface ${ifaceName}. ` +
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
    throw new Error(`Could not find an IPv4 address for interface "${ifaceName}"`);
  }
  socket = createSocket('udp4');
  socket.bind(SERVER_PORT, address);
  deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
  broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';

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

      // Logging
      _jsPrintString: handlePrintString,
      _jsPrintlnString: handlePrintlnString,

      // Platform
      _jsGetRelativeTime: handleGetRelativeTime,
      _jsGetDeviceId: handleGetDeviceId,

      // Transport Write
      _jsBeginWrite: handleBeginWrite,
      _jsWrite8: handleWrite8,
      _jsWrite16: handleWrite16,
      _jsWrite32: handleWrite32,
      _jsWriteBuffer: handleWriteBuffer,
      _jsEndWrite: handleEndWrite,

      // Transport read
      _jsParsePacket: handleParsePacket,
      _jsRead8: handleRead8,
      _jsRead16: handleRead16,
      _jsRead32: handleRead32,
      _jsRead: handleRead
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
