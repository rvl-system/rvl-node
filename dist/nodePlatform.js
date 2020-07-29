"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("./output");
const WRITE_BUFFER_SIZE = 1024;
const startTime = process.hrtime();
let writeBuffer;
let writeBufferHead = 0;
// void beginWrite(uint8_t destination);
function beginWrite(destination) {
    writeBuffer = Buffer.allocUnsafe(WRITE_BUFFER_SIZE);
    writeBufferHead = 0;
}
exports.beginWrite = beginWrite;
// void write8(uint8_t data);
function write8(data) {
    if (!writeBuffer) {
        throw new Error(`write8 called before beginWrite`);
    }
    writeBuffer.writeUInt8(data, writeBufferHead);
    writeBufferHead += 1;
}
exports.write8 = write8;
// void write16(uint16_t data);
function write16(data) {
    if (!writeBuffer) {
        throw new Error(`write16 called before beginWrite`);
    }
    writeBuffer.writeUInt16BE(data, writeBufferHead);
    writeBufferHead += 2;
}
exports.write16 = write16;
// void write32(uint32_t data);
function write32(data) {
    if (!writeBuffer) {
        throw new Error(`write32 called before beginWrite`);
    }
    writeBuffer.writeUInt32BE(data, writeBufferHead);
    writeBufferHead += 4;
}
exports.write32 = write32;
// void write(uint8_t* data, uint16_t length);
function write(data, length) {
    if (!writeBuffer) {
        throw new Error(`write called before beginWrite`);
    }
    const dataBuffer = Module.HEAPU8.subarray(data, data + length);
    writeBuffer.set(dataBuffer, writeBufferHead);
    writeBufferHead += length;
}
exports.write = write;
// void endWrite();
function endWrite() {
    if (!writeBuffer) {
        throw new Error(`endWrite called before beginWrite`);
    }
    const payload = writeBuffer.slice(0, writeBufferHead).toString('base64');
    console.log(payload);
    // TODO
}
exports.endWrite = endWrite;
// uint16_t parsePacket();
function parsePacket() {
    // TODO
    return 0;
}
exports.parsePacket = parsePacket;
// uint8_t read8();
function read8() {
    // TODO
    return 0;
}
exports.read8 = read8;
// uint16_t read16();
function read16() {
    // TODO
    return 0;
}
exports.read16 = read16;
// uint32_t read32();
function read32() {
    // TODO
    return 0;
}
exports.read32 = read32;
// void read(uint8_t* buffer, uint16_t length);
function read(bufferPointer, length) {
    // TODO
}
exports.read = read;
// uint16_t getDeviceId();
function getDeviceId() {
    // TODO
    return 0;
}
exports.getDeviceId = getDeviceId;
// uint32_t localClock();
function localClock() {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    return seconds * 1000 + Math.round(nanoseconds / 1000000);
}
exports.localClock = localClock;
// void print(const char* str);
function print(messagePointer) {
    const str = Module.UTF8ToString(messagePointer);
    process.stdout.write(str);
}
exports.print = print;
// void println(const char* str);
function println(messagePointer) {
    const str = Module.UTF8ToString(messagePointer);
    process.stdout.write(`${str}\n`);
}
exports.println = println;
//# sourceMappingURL=nodePlatform.js.map