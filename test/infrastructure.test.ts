import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeInfrastructurePacket } from '../src/protocols/infrastructure.ts';

const COORDINATOR = 1;
const OWN_ID = 10;
const PEER = 20;

function packet(source: number, type: number, payload: number[]): Buffer {
  return Buffer.from([...Buffer.from('RVLI'), 1, source, type, 0, ...payload]);
}

function reference(source: number, id: number, startOfSet: boolean): Buffer {
  return packet(source, 2, [1, id >> 8, id & 0xff, 0, startOfSet ? 1 : 0, 0]);
}

function observation(source: number, id: number, time: number): Buffer {
  const clock = Buffer.alloc(4);
  clock.writeUInt32BE(time);
  return packet(source, 2, [2, id >> 8, id & 0xff, 0, ...clock]);
}

test('references, observations and ID replies are read', () => {
  assert.deepEqual(
    decodeInfrastructurePacket(reference(COORDINATOR, 0x1234, true), OWN_ID),
    { type: 'reference', source: COORDINATOR, id: 0x1234, startOfSet: true }
  );
  assert.deepEqual(
    decodeInfrastructurePacket(observation(PEER, 7, 0xfedcba98), OWN_ID),
    { type: 'observation', source: PEER, id: 7, observedTime: 0xfedcba98 }
  );
  assert.deepEqual(
    decodeInfrastructurePacket(packet(COORDINATOR, 1, [2, 42]), undefined),
    { type: 'idReply', source: COORDINATOR, deviceId: 42 }
  );
});

test('source 255 and own id packets are dropped', () => {
  // Source 255 is any node without an ID, this one's own request among them
  assert.equal(
    decodeInfrastructurePacket(packet(255, 1, [1]), undefined),
    undefined
  );
  assert.equal(
    decodeInfrastructurePacket(observation(OWN_ID, 7, 1000), OWN_ID),
    undefined
  );
  assert.notEqual(
    decodeInfrastructurePacket(observation(OWN_ID, 7, 1000), undefined),
    undefined
  );
});

test('another version and short packets are dropped', () => {
  const otherVersion = reference(COORDINATOR, 1, true);
  otherVersion[4] = 2;
  assert.equal(decodeInfrastructurePacket(otherVersion, OWN_ID), undefined);
  const short = observation(PEER, 7, 1000).subarray(0, 15);
  assert.equal(decodeInfrastructurePacket(short, OWN_ID), undefined);
});
