import { expect, test } from 'vitest';

import {
  DEFAULT_INTERFACES,
  FLEET_BROADCAST,
  ipv4,
  loadNode,
  setInterfaces,
  setPortInUse,
  startNode,
} from './harness.ts';
import { buildIdReply, RVLA_PORT, RVLI_PORT } from './packets.ts';

test('init binds the RVLI port for broadcast and resolves', async () => {
  const node = await startNode();
  expect(node.socket.boundPort).toBe(RVLI_PORT);
  expect(node.socket.broadcast).toBe(true);
  expect(node.transport.getNetworkInterface()).toBe('en0');
  expect(node.now()).toBe(0);
});

test('the public functions throw until init resolves', async () => {
  const node = await loadNode();
  const notInitialized = /not initialized/;
  expect(() => node.animation.setOff(0)).toThrow(notInitialized);
  expect(() =>
    node.animation.setAnimationParameters(0, { animations: [] })
  ).toThrow(notInitialized);
  expect(() => node.animation.getEarliestStartFrame(0)).toThrow(notInitialized);
  expect(() => node.identity.getDeviceId()).toThrow(notInitialized);
  expect(() => node.identity.isConnected()).toThrow(notInitialized);
  expect(() => node.transport.getNetworkInterface()).toThrow(notInitialized);
  // The clock has its own reason
  expect(() => node.clock.getAnimationClock()).toThrow(/not synchronized/);
});

test('a second init throws', async () => {
  const node = await startNode();
  await expect(node.rvl.init({ networkInterface: 'en0' })).rejects.toThrow(
    /already been called/
  );
});

test('a port in use is an explicit error, and init can be tried again', async () => {
  const node = await loadNode({ portInUse: true });
  const attempt = node.rvl.init({ networkInterface: 'en0' });
  await expect(attempt).rejects.toThrow(/already in use/);
  await expect(attempt).rejects.toMatchObject({
    cause: { code: 'EADDRINUSE' },
  });
  expect(node.socket.closed).toBe(true);
  setPortInUse(false);
  await node.rvl.init({ networkInterface: 'en0' });
  expect(node.socket.boundPort).toBe(RVLI_PORT);
});

test('the default interface is the first usable one', async () => {
  const interfaces = {
    lo0: [ipv4('127.0.0.1', '255.0.0.0', true)],
    en1: [ipv4('169.254.10.20', '255.255.0.0')],
    en0: [ipv4('10.1.2.3')],
    en2: [ipv4('10.1.3.4')],
  };
  const node = await loadNode({ interfaces });
  expect(node.net.getAvailableInterfaces()).toEqual(['en0', 'en2']);
  expect(node.net.getDefaultInterface()).toBe('en0');
  await node.rvl.init();
  expect(node.transport.getNetworkInterface()).toBe('en0');
});

test('init throws with no usable interface', async () => {
  const node = await loadNode({
    interfaces: { lo0: [ipv4('127.0.0.1', '255.0.0.0', true)] },
  });
  await expect(node.rvl.init()).rejects.toThrow(/usable default/);
});

test('sends go to the subnet broadcast, RVLI on 4979 and RVLA on 4978', async () => {
  const node = await startNode();
  const [request] = node.sent();
  expect(request.address).toBe(FLEET_BROADCAST);
  expect(request.port).toBe(RVLI_PORT);
  node.assignId(20);
  await node.syncClock();
  node.clearSent();
  void node.animation.setOff(0);
  const [scene] = node.sent();
  expect(scene.address).toBe(FLEET_BROADCAST);
  expect(scene.port).toBe(RVLA_PORT);
});

test('a packet from outside the subnet is ignored', async () => {
  const node = await startNode();
  node.deliver(buildIdReply(7), '10.0.0.1');
  expect(node.identity.getDeviceId()).toBeUndefined();
  node.deliver(buildIdReply(7), '192.168.4.1');
  expect(node.identity.getDeviceId()).toBe(7);
});

test('with the address gone nothing is written to the socket', async () => {
  const node = await startNode();
  node.assignId(20);
  await node.syncClock();
  void node.animation.setOff(0);
  expect(node.scenes()).toHaveLength(1);
  setInterfaces({});
  node.clearSent();
  await node.advance(2000);
  expect(node.sent()).toHaveLength(0);
  setInterfaces(DEFAULT_INTERFACES);
  await node.advance(2000);
  expect(node.sent().length).toBeGreaterThan(0);
});
