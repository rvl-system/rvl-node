import { expect, test, vi } from 'vitest';

import {
  DEFAULT_INTERFACES,
  ipv4,
  loadNode,
  setInterfaces,
  startNode,
} from './harness.ts';
import { buildIdReply, RVLI_PORT } from './packets.ts';

const ID_REQUEST = Buffer.from([0x52, 0x56, 0x4c, 0x49, 1, 255, 1, 0, 1]);

test('an ID request goes out at init', async () => {
  const node = await startNode();
  expect(node.sent()).toHaveLength(1);
  expect(node.sent()[0].bytes).toEqual(ID_REQUEST);
  expect(node.sent()[0].port).toBe(RVLI_PORT);
  expect(node.identity.isConnected()).toBe(false);
  expect(node.identity.getDeviceId()).toBeUndefined();
});

test('the request is repeated every second or so until a reply', async () => {
  const node = await startNode();
  await node.advance(999);
  expect(node.sent()).toHaveLength(1);
  await node.advance(251);
  expect(node.sent()).toHaveLength(2);
  await node.advance(1250);
  expect(node.sent()).toHaveLength(3);
  node.assignId(7);
  await node.advance(10000);
  expect(node.sent()).toHaveLength(3);
});

test('a reply assigns the ID and connects once', async () => {
  const node = await startNode();
  const connected = vi.fn();
  node.identity.on('connected', connected);
  node.assignId(7);
  expect(node.identity.getDeviceId()).toBe(7);
  expect(node.identity.isConnected()).toBe(true);
  expect(connected).toHaveBeenCalledTimes(1);
  node.assignId(7);
  expect(connected).toHaveBeenCalledTimes(1);
  // A changed ID while connected is taken without a second event
  node.assignId(8);
  expect(node.identity.getDeviceId()).toBe(8);
  expect(connected).toHaveBeenCalledTimes(1);
});

test('replies that are not a reply to this node are dropped', async () => {
  const node = await startNode();
  node.assignId(10);
  const other = buildIdReply(11);
  const badSignature = Buffer.from(other);
  badSignature[3] = 0x58;
  const otherVersion = Buffer.from(other);
  otherVersion[4] = 2;
  for (const packet of [
    buildIdReply(11, 255),
    buildIdReply(11, 10),
    badSignature,
    otherVersion,
    other.subarray(0, 9),
    buildIdReply(240),
    // Another node's request, which is the same RVLI type with the request
    // subtype
    Buffer.from([0x52, 0x56, 0x4c, 0x49, 1, 30, 1, 0, 1]),
  ]) {
    node.deliver(packet);
    expect(node.identity.getDeviceId()).toBe(10);
  }
  node.deliver(other);
  expect(node.identity.getDeviceId()).toBe(11);
});

test('losing the address disconnects, and the ID is requested again on return', async () => {
  const node = await startNode();
  const connected = vi.fn();
  const disconnected = vi.fn();
  node.identity.on('connected', connected);
  node.identity.on('disconnected', disconnected);
  node.assignId(7);
  setInterfaces({});
  await node.advance(250);
  expect(disconnected).toHaveBeenCalledTimes(1);
  expect(node.identity.isConnected()).toBe(false);
  expect(node.identity.getDeviceId()).toBeUndefined();
  await node.advance(5000);
  expect(node.sent()).toHaveLength(1);

  setInterfaces(DEFAULT_INTERFACES);
  await node.advance(250);
  expect(node.sent()).toHaveLength(2);
  expect(node.sent()[1].bytes).toEqual(ID_REQUEST);
  node.assignId(9);
  expect(connected).toHaveBeenCalledTimes(2);
  expect(node.identity.getDeviceId()).toBe(9);
});

test('a missing ID is warned about every ten seconds', async () => {
  const node = await startNode();
  await node.advance(9999);
  expect(node.warn).not.toHaveBeenCalled();
  await node.advance(1);
  expect(node.warn).toHaveBeenCalledTimes(1);
  expect(node.warn.mock.calls[0][0]).toMatch(/No device ID/);
  await node.advance(9999);
  expect(node.warn).toHaveBeenCalledTimes(1);
  await node.advance(1);
  expect(node.warn).toHaveBeenCalledTimes(2);
  node.assignId(7);
  await node.advance(20000);
  expect(node.warn).toHaveBeenCalledTimes(2);
});

test('a missing address is warned about instead', async () => {
  const node = await loadNode({
    interfaces: { en0: [], en1: [ipv4('10.1.2.3')] },
  });
  await node.rvl.init({ networkInterface: 'en0' });
  expect(node.sent()).toHaveLength(0);
  await node.advance(10000);
  expect(node.warn).toHaveBeenCalledTimes(1);
  expect(node.warn.mock.calls[0][0]).toMatch(/Waiting for en0.*en1/);
});
