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
import { AddressInfo } from 'net';

const SERVER_PORT = 4978;
const UPDATE_RATE = 33;

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

function createInternalErrorMessage(msg: string): string {
  return `Internal Error: ${msg}. 'This is a bug, please file an issue at https://github.com/nebrius/RVL-Node/issues.`;
}

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

let currentReadBuffer: Buffer | undefined;
let currentReadBufferIndex = 0;
const readBuffers: Buffer[] = [];

function handleParsePacket(): number {
  currentReadBuffer = readBuffers.shift();
  currentReadBufferIndex = 0;
  return currentReadBuffer ? currentReadBuffer.length : 0;
}

function handleRead8(): number {
  if (!currentReadBuffer) {
    throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
  }
  if (currentReadBufferIndex > currentReadBuffer.length - 1) {
    throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
  }
  const value = currentReadBuffer.readUInt8(currentReadBufferIndex);
  currentReadBufferIndex += 1;
  return value;
}

function handleRead16(): number {
  if (!currentReadBuffer) {
    throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
  }
  if (currentReadBufferIndex > currentReadBuffer.length - 2) {
    throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
  }
  const value = currentReadBuffer.readUInt16BE(currentReadBufferIndex);
  currentReadBufferIndex += 1;
  return value;
}

function handleRead32(): number {
  if (!currentReadBuffer) {
    throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
  }
  if (currentReadBufferIndex > currentReadBuffer.length - 4) {
    throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
  }
  const value = currentReadBuffer.readUInt32BE(currentReadBufferIndex);
  currentReadBufferIndex += 1;
  return value;
}

function handleRead(ptr: number, len: number): void {
  if (!currentReadBuffer) {
    throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
  }
  if (currentReadBufferIndex > currentReadBuffer.length - len) {
    throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
  }
  const view = new Uint8Array(memory.buffer, ptr, len);
  for (let i = 0; i < len; i++) {
    view[i] = currentReadBuffer[currentReadBufferIndex++];
  }
}

export function init(ifaceName: string, logLevel: 'error' | 'info' | 'debug', cb: (err?: Error) => void) {
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
  deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
  broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';

  let logLevelEnum: number = 0;
  switch (logLevel) {
    case 'error':
      logLevelEnum = 1;
      break;
    case 'info':
      logLevelEnum = 2;
      break;
    case 'debug':
      logLevelEnum = 3;
      break;
    default:
      throw new Error(`Invalid log level ${logLevel}`);
  }

  readFile(join(__dirname, 'output.wasm'), (readErr, buf) => {
    if (readErr) {
      cb(readErr);
      return;
    }
    const bytes = new Uint8Array(buf);
    const tableArgs: WebAssembly.TableDescriptor = {
      initial: tableInitial,
      element: 'anyfunc'
    };
    if (typeof tableMaximum === 'number') {
      tableArgs.maximum = tableMaximum;
    }
    const env = {
      ...asmLibraryArg,
      table: new WebAssembly.Table(tableArgs),
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
      ...asmGlobalArg,
      NaN,
      Infinity
    };
    WebAssembly.instantiate(bytes, { env, global, 'global.Math': Math }).then((result) => {
      wasmExports = result;
      setImmediate(() => {
        result.instance.exports._init(logLevelEnum);

        socket = createSocket({
          type: 'udp4',
          reuseAddr: true
        });

        socket.on('message', (msg, rinfo) => {
          if (rinfo.port !== SERVER_PORT) {
            return;
          }
          readBuffers.push(msg);
        });

        socket.on('error', (err) => {
          console.error(err);
          socket.close();
        });

        socket.on('listening', () => {
          const addressInfo = socket.address() as AddressInfo;
          console.log(`UDP server listening on ${addressInfo.address}:${addressInfo.port}`);
          socket.setBroadcast(true);
          cb();
        });

        socket.bind(SERVER_PORT, address);
      });
    });
  });
}

let loopTimer: NodeJS.Timeout;

export function start(): void {
  if (!wasmExports) {
    throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
  }
  function loop() {
    const loopStartTime = process.hrtime.bigint();
    if (wasmExports) {
      wasmExports.instance.exports._loop();
    }
    const now = process.hrtime.bigint();
    const timeConsumed = Number((now - loopStartTime) / 1000000n);
    if (timeConsumed > UPDATE_RATE) {
      console.log(`Warning: system loop took ${timeConsumed - UPDATE_RATE}ms longer than the update rate`);
      setImmediate(loop);
    } else {
      loopTimer = setTimeout(loop, UPDATE_RATE - timeConsumed);
    }
  }
  loop();
}

export function stop(): void {
  if (!wasmExports) {
    throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
  }
  clearTimeout(loopTimer);
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
