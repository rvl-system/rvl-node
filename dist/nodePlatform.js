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
exports.println = exports.print = exports.parsePacket = exports.endWrite = exports.addPacketToQueue = void 0;
const util_1 = require("./util");
const Module = require("./output");
const packetQueue = [];
function addPacketToQueue(packet) {
    packetQueue.push(packet);
}
exports.addPacketToQueue = addPacketToQueue;
// void endWrite(uint8_t destination, uint8_t* buffer, uint8_t length);
function endWrite(destination, bufferPointer, length) {
    const payload = Module.HEAPU8.subarray(bufferPointer, bufferPointer + length);
    const message = {
        type: 'sendPacket',
        destination,
        payload: Buffer.from(payload).toString('base64')
    };
    (0, util_1.sendMessage)(message);
}
exports.endWrite = endWrite;
// uint16_t parsePacket(uint8_t* buffer);
function parsePacket(bufferPointer) {
    const nextPacket = packetQueue.shift();
    if (!nextPacket) {
        return 0;
    }
    const dataBuffer = Module.HEAPU8.subarray(bufferPointer, bufferPointer + nextPacket.length);
    dataBuffer.set(nextPacket);
    return nextPacket.length;
}
exports.parsePacket = parsePacket;
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