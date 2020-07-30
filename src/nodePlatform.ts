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

import { ISendPacketMessage } from './types';
import { sendMessage } from './util';
import Module = require('./output');

const WRITE_BUFFER_SIZE = 1024;

const startTime = process.hrtime();

let writeBuffer: Buffer;
let writeBufferHead = 0;
let writeDestination = 0;

const packetQueue: Buffer[] = [];
let currentPacket: Buffer;
let currentPacketHead = 0;

export function addPacketToQueue(packet: Buffer): void {
  packetQueue.push(packet);
}

// void beginWrite(uint8_t destination);
export function beginWrite(destination: number): void {
  writeBuffer = Buffer.allocUnsafe(WRITE_BUFFER_SIZE);
  writeBufferHead = 0;
  writeDestination = destination;
}

// void write8(uint8_t data);
export function write8(data: number): void {
  if (!writeBuffer) {
    throw new Error(`write8 called before beginWrite`);
  }
  writeBuffer.writeUInt8(data, writeBufferHead);
  writeBufferHead += 1;
}

// void write16(uint16_t data);
export function write16(data: number): void {
  if (!writeBuffer) {
    throw new Error(`write16 called before beginWrite`);
  }
  writeBuffer.writeUInt16BE(data, writeBufferHead);
  writeBufferHead += 2;
}

// void write32(uint32_t data);
export function write32(data: number): void {
  if (!writeBuffer) {
    throw new Error(`write32 called before beginWrite`);
  }
  writeBuffer.writeUInt32BE(data, writeBufferHead);
  writeBufferHead += 4;
}

// void write(uint8_t* data, uint16_t length);
export function write(data: number, length: number): void {
  if (!writeBuffer) {
    throw new Error(`write called before beginWrite`);
  }
  const dataBuffer = Module.HEAPU8.subarray(data, data + length);
  writeBuffer.set(dataBuffer, writeBufferHead);
  writeBufferHead += length;
}

// void endWrite();
export function endWrite(): void {
  if (!writeBuffer) {
    throw new Error(`endWrite called before beginWrite`);
  }
  const payload = writeBuffer.slice(0, writeBufferHead).toString('base64');
  const message: ISendPacketMessage = {
    type: 'sendPacket',
    destination: writeDestination,
    payload
  };
  sendMessage(message);
}

// uint16_t parsePacket();
export function parsePacket(): number {
  const nextPacket = packetQueue.shift();
  if (!nextPacket) {
    return 0;
  }
  currentPacket = nextPacket;
  currentPacketHead = 0;
  return currentPacket.length;
}

// uint8_t read8();
export function read8(): number {
  const data = currentPacket.readUInt8(currentPacketHead);
  currentPacketHead += 1;
  return data;
}

// uint16_t read16();
export function read16(): number {
  const data = currentPacket.readUInt16BE(currentPacketHead);
  currentPacketHead += 2;
  return data;
}

// uint32_t read32();
export function read32(): number {
  const data = currentPacket.readUInt32BE(currentPacketHead);
  currentPacketHead += 4;
  return data;
}

// void read(uint8_t* buffer, uint16_t length);
export function read(bufferPointer: number, length: number): void {
  const dataBuffer = Module.HEAPU8.subarray(bufferPointer, bufferPointer + length);
  dataBuffer.set(currentPacket.subarray(currentPacketHead, currentPacketHead + length));
  currentPacketHead += length;
}

// uint16_t getDeviceId();
export function getDeviceId(): number {
  // TODO
  return 0;
}

// uint32_t localClock();
export function localClock(): number {
  const [ seconds, nanoseconds ] = process.hrtime(startTime);
  return seconds * 1000 + Math.round(nanoseconds / 1000000);
}

// void print(const char* str);
export function print(messagePointer: number): void {
  const str = Module.UTF8ToString(messagePointer);
  process.stdout.write(str);
}

// void println(const char* str);
export function println(messagePointer: number): void {
  const str = Module.UTF8ToString(messagePointer);
  process.stdout.write(`${str}\n`);
}
