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

import Module = require('./output');

const startTime = process.hrtime();

// void beginWrite(uint8_t destination);
export function beginWrite(destination: number): void {
  // TODO
}

// void write8(uint8_t data);
export function write8(data: number): void {
  // TODO
}

// void write16(uint16_t data);
export function write16(data: number): void {
  // TODO
}

// void write32(uint32_t data);
export function write32(data: number): void {
  // TODO
}

// void write(uint8_t* data, uint16_t length);
export function write(data: number, length: number): void {
  // TODO
}

// void endWrite();
export function endWrite(): void {
  // TODO
}

// uint16_t parsePacket();
export function parsePacket(): number {
  // TODO
  return 0;
}

// uint8_t read8();
export function read8(): number {
  // TODO
  return 0;
}

// uint16_t read16();
export function read16(): number {
  // TODO
  return 0;
}

// uint32_t read32();
export function read32(): number {
  // TODO
  return 0;
}

// void read(uint8_t* buffer, uint16_t length);
export function read(buffer: number, length: number): void {
  // TODO
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
