/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

Raver Lights Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node.  If not, see <http://www.gnu.org/licenses/>.
*/

import { readFile, readFileSync } from 'fs';
import { join } from 'path';
import { networkInterfaces } from 'os';
import { createSocket, Socket } from 'dgram';
import { asmGlobalArg, asmLibraryArg, memoryBase, tableBase, tableInitial, tableMaximum } from './output';
import { AddressInfo } from 'net';
import { IWave, IWaveChannel, IWaveParameters } from './types';

export const DEFAULT_TIME_PERIOD = 255;
export const DEFAULT_DISTANCE_PERIOD = 32;
export const MAX_NUM_WAVES = 4; // Note: this MUST match the NUM_WAVES define in C++!

export function createEmptyWave(): IWave {
  const emptyChannel: IWaveChannel = { a: 0, b: 0, w_x: 0, w_t: 0, phi: 0 };
  return {
    h: { ...emptyChannel },
    s: { ...emptyChannel },
    v: { ...emptyChannel },
    a: { ...emptyChannel }
  };
}

export function createEmptyWaveParameters(): IWaveParameters {

  const waves: IWave[] = [];
  for (let i = 0; i < MAX_NUM_WAVES; i++) {
    waves.push({ ...createEmptyWave() });
  }
  return {
    waves,
    timePeriod: DEFAULT_TIME_PERIOD,
    distancePeriod: DEFAULT_DISTANCE_PERIOD
  };
}

const UPDATE_RATE = 33;
const CLOCK_SYNC_INTERVAL = 2000;
const PACKET_SIGNATURE = [ 'R'.charCodeAt(0), 'V'.charCodeAt(0), 'L'.charCodeAt(0), 'X'.charCodeAt(0) ];

let wasmExports: WebAssembly.ResultObject | undefined;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
let waveSettingsPointer = 0;
let serverPort: number = NaN;
let running = false;

let waveSettingsUpdatedCallback: (parameters: IWaveParameters) => void = () => {
  // Do nothing
};

let powerStateUpdatedCallback: (powerState: boolean) => void = () => {
  // Do nothing
};

let brightnessUpdatedCallback: (brightness: number) => void = () => {
  // Do nothing
};

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

function handleOnWaveSettingsUpdated(): void {
  const view = Buffer.from(memory.buffer, waveSettingsPointer, structData.totalSize);
  const waveSettings = createEmptyWaveParameters();
  for (const entryName in structData.entryDictionary) {
    if (!structData.entryDictionary.hasOwnProperty(entryName)) {
      continue;
    }
    const structEntry = structData.entryDictionary[entryName];
    let value = 0;
    switch (structEntry.type) {
      case 'uint8_t':
        value = view.readUInt8(structEntry.index);
        break;
      case 'int8_t':
        value = view.readInt8(structEntry.index);
        break;
      case 'uint16_t':
        value = view.readUInt16BE(structEntry.index);
        break;
      case 'int16_t':
        value = view.readInt16BE(structEntry.index);
        break;
      case 'uint32_t':
        value = view.readUInt32BE(structEntry.index);
        break;
      case 'int32_t':
        value = view.readInt32BE(structEntry.index);
        break;
      default:
        throw new Error(createInternalErrorMessage(`Encountered unexpected struct type "${structEntry.type}"`));
    }
    switch (structEntry.path.length) {
      case 1:
        (waveSettings as any)
          [structEntry.path[0]]
          = value;
        break;
      case 2:
        (waveSettings as any)
          [structEntry.path[0]][structEntry.path[1]]
          = value;
        break;
      case 3:
        (waveSettings as any)
          [structEntry.path[0]][structEntry.path[1]][structEntry.path[2]]
          = value;
        break;
      case 4:
        (waveSettings as any)
          [structEntry.path[0]][structEntry.path[1]][structEntry.path[2]]
          [structEntry.path[3]]
          = value;
        break;
      case 5:
        (waveSettings as any)
          [structEntry.path[0]][structEntry.path[1]][structEntry.path[2]]
          [structEntry.path[3]][structEntry.path[4]]
          = value;
        break;
      case 6:
        (waveSettings as any)
          [structEntry.path[0]][structEntry.path[1]][structEntry.path[2]]
          [structEntry.path[3]][structEntry.path[4]][structEntry.path[5]]
          = value;
        break;
    }
  }
  waveSettingsUpdatedCallback(waveSettings);
}

function handleOnPowerStateUpdated(powerState: number): void {
  powerStateUpdatedCallback(!!powerState);
}

function handleOnBrightnessUpdated(brightness: number): void {
  brightnessUpdatedCallback(brightness);
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
  channel: number,
  logLevel: 'error' | 'info' | 'debug',
  enableClockSync: boolean,
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
  if (channel < 0 || channel > 7) {
    throw new Error('Channel must be an integer between 0 and 7');
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
      _jsOnWaveSettingsUpdated: handleOnWaveSettingsUpdated,
      _jsOnPowerStateUpdated: handleOnPowerStateUpdated,
      _jsOnBrightnessUpdated: handleOnBrightnessUpdated,

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
        waveSettingsPointer = result.instance.exports._init(logLevelEnum, mode === 'controller' ? 1 : 0, channel);

        socket = createSocket({
          type: 'udp4',
          reuseAddr: true
        });

        socket.on('message', (msg, rinfo) => {
          if (rinfo.port !== port || rinfo.address === address) {
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

          if (enableClockSync) {
            console.log('Enabling clock sync server');
            const clockStartTime = Date.now();
            setInterval(() => {
              if (!running) {
                return;
              }
              const clockTime = Date.now() - clockStartTime;
              console.log(`Pinging clock time ${clockTime}`);
              const msg = new Uint8Array(14);
              const view = new DataView(msg.buffer);

              // Signature: 4 bytes = "CLKS"
              for (let i = 0; i < 4; i++) {
                view.setUint8(i, PACKET_SIGNATURE[i]);
              }
              view.setUint8(4, 1); // Version: 1 byte = 2
              view.setUint8(5, 240 + channel); // Destination: 1 byte = The channel of this device
              view.setUint8(6, deviceId); // Source: 1 byte = This device's ID
              view.setUint8(7, 3); // Packet type: 1 byte = 1: System, 2: Discover, 3: Clock Sync, 4: Wave Animation
              view.setUint16(8, 0);
              view.setUint32(10, clockTime); // Clock: 4 bytes = running clock, relative to app start
              socket.send(msg as any, port, broadcastAddress);
            }, CLOCK_SYNC_INTERVAL);
          }

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
  if (running) {
    return;
  }
  running = true;
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
  running = false;
  clearTimeout(loopTimer);
}

export function setWaveParameters(params: IWaveParameters): void {
  if (!wasmExports) {
    throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
  }
  const view = Buffer.from(memory.buffer, waveSettingsPointer, structData.totalSize);
  function writeValue(path: string, value: any) {
    if (typeof value === 'number') {
      const structEntry = structData.entryDictionary[path];
      if (!structEntry) {
        throw new Error(createInternalErrorMessage(`Uknown struct path "${path}"`));
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
          throw new Error(createInternalErrorMessage(`Encountered unexpected struct type "${structEntry.type}"`));
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

export function setBrightness(brightness: number): void {
  if (!wasmExports) {
    throw new Error(createInternalErrorMessage(`setBrightness called but the wasm module has not been loaded`));
  }
  wasmExports.instance.exports._setBrightness(brightness);
}

export function setPowerState(powerState: boolean): void {
  if (!wasmExports) {
    throw new Error(createInternalErrorMessage(`setPowerState called but the wasm module has not been loaded`));
  }
  wasmExports.instance.exports._setPowerState(powerState ? 1 : 0);
}

export function listenForWaveParameterUpdates(cb: (parameters: IWaveParameters) => void): void {
  waveSettingsUpdatedCallback = cb;
}

export function listenForPowerStateUpdates(cb: (powerState: boolean) => void): void {
  powerStateUpdatedCallback = cb;
}

export function listenForBrightnessUpdates(cb: (brightness: number) => void): void {
  brightnessUpdatedCallback = cb;
}
