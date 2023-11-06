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

const packetQueue: Buffer[] = [];

export function addPacketToQueue(packet: Buffer): void {
  packetQueue.push(packet);
}

// void endWrite(uint8_t destination, uint8_t* buffer, uint8_t length);
export function endWrite(destination: number, bufferPointer: number, length: number): void {
  const payload = Module.HEAPU8.subarray(bufferPointer, bufferPointer + length);
  const message: ISendPacketMessage = {
    type: 'sendPacket',
    destination,
    payload: Buffer.from(payload).toString('base64')
  };
  sendMessage(message);
}

// uint16_t parsePacket(uint8_t* buffer);
export function parsePacket(bufferPointer: number): number {
  const nextPacket = packetQueue.shift();
  if (!nextPacket) {
    return 0;
  }
  const dataBuffer = Module.HEAPU8.subarray(bufferPointer, bufferPointer + nextPacket.length);
  dataBuffer.set(nextPacket);
  return nextPacket.length;
}
