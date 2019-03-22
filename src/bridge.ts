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

import { readFile, readFileSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';
import { createSocket, Socket } from 'dgram';

import { asmGlobalArg, asmLibraryArg, memoryBase, tableBase, tableInitial, tableMaximum } from './output';
import { AddressInfo } from 'net';

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

const UPDATE_RATE = 33;

let wasmExports: WebAssembly.ResultObject | undefined;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
let waveSettingsPointer = 0;
let serverPort: number = NaN;

interface IStructInfoEntry {
  name: string;
  type: string;
  initialValue: number;
  size: number;
  index: number;
}

interface IStructInfo {
  totalSize: number;
  entryDictionary: { [entryName: string]: IStructInfoEntry };
}

const structData: IStructInfo = JSON.parse(readFileSync(join(__dirname, 'structInfo.json')).toString());

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
  socket.send(Buffer.from(writeBuffer), serverPort, broadcastAddress);
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
  currentReadBufferIndex += 2;
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
  currentReadBufferIndex += 4;
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

// External interface methods

export function init(
  networkInterface: string,
  port: number,
  mode: 'controller' | 'receiver',
  logLevel: 'error' | 'info' | 'debug',
  cb: (err?: Error) => void
) {
  const interfaces = networkInterfaces();
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
  deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
  broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';
  serverPort = port;

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
      throw new Error(createInternalErrorMessage(readErr.message));
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
        waveSettingsPointer = result.instance.exports._init(logLevelEnum, mode === 'controller' ? 1 : 0);

        socket = createSocket({
          type: 'udp4',
          reuseAddr: true
        });

        socket.on('message', (msg, rinfo) => {
          if (rinfo.port !== port) {
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

        socket.bind(port);
      });
    });
  });
}

let loopTimer: NodeJS.Timeout;

export function start(): void {
  if (!wasmExports) {
    throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
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
    throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
  }
  clearTimeout(loopTimer);
}

export function setWaveParameters(params: IWaveParameters): void {
  if (!wasmExports) {
    throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
  }
  const view = new Uint8Array(memory.buffer, waveSettingsPointer, structData.totalSize);
  function writeValue(path: string, value: any) {
    if (typeof value === 'number') {
      const structEntry = structData.entryDictionary[path];
      if (!structEntry) {
        throw new Error(createInternalErrorMessage(`Uknown struct path "${path}"`));
      }
      switch (structEntry.size) {
        case 1:
          view[structEntry.index] = value & 0xFF;
          break;
        case 2:
          view[structEntry.index] = (value >> 8) & 0x00F;
          view[structEntry.index + 1] = value & 0x00FF;
          break;
        case 4:
          view[structEntry.index] = (value >> 24) & 0x000000FF;
          view[structEntry.index + 1] = (value >> 16) & 0x000000FF;
          view[structEntry.index + 2] = (value >> 8) & 0x000000FF;
          view[structEntry.index + 3] = value & 0x000000FF;
          break;
        default:
          throw new Error(createInternalErrorMessage(`Encountered unexepcted struct entry size ${structEntry.size}`));
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
      throw new Error(createInternalErrorMessage(`Unsupported value type `));
    }
  }
  for (const param in params) {
    if (!params.hasOwnProperty(param)) {
      continue;
    }
    writeValue(param, (params as any)[param]);
  }
  wasmExports.instance.exports._waveParametersUpdated();
}

export function getAnimationTime(): number {
  // TODO
  return 0;
}

export function listenForWaveParameterUpdates(cb: (parameters: IWaveParameters) => void): void {
  // TODO
}
