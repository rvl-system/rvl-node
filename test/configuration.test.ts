import { expect, test } from 'vitest';

import { type Node, startNode } from './harness.ts';
import { buildStatus, RVLI_PORT } from './packets.ts';

// The three requests and the status they are answered with, through the
// socket as a board would see and send them. The nickname configure below is
// also rvl-firmware's GOLDEN_CONFIGURE_PACKET, which test_configuration feeds
// through its parser, so the two are kept in step by hand

// 'RVLI', version 1, from device 20
const HEADER = [0x52, 0x56, 0x4c, 0x49, 1, 20];
const MINI = 10;

const ALL_CAPABILITIES = {
  channel: true,
  brightness: true,
  pixelCount: true,
  colorOrder: true,
  statusLedBrightness: true,
  nickname: true,
  currentLimit: true,
};

// A sender with ID 20, synced, so the boards take it as a source
async function startConfigurer(): Promise<Node> {
  const node = await startNode();
  node.assignId(20);
  await node.syncClock();
  node.clearSent();
  return node;
}

test('the requests are written as a board reads them', async () => {
  const node = await startConfigurer();
  const { configureNode, getNodes, identifyNode } = node.configuration;
  void getNodes();
  void identifyNode(MINI);
  void configureNode(MINI, 'channel', 1);
  void configureNode(MINI, 'brightness', 200);
  void configureNode(MINI, 'pixelCount', 240);
  void configureNode(MINI, 'colorOrder', 'BGR');
  void configureNode(MINI, 'statusLedBrightness', 30);
  void configureNode(MINI, 'nickname', 'Mini 1');
  void configureNode(MINI, 'currentLimit', 3000);
  const packets = node.sent();
  expect(packets.every((packet) => packet.port === RVLI_PORT)).toBe(true);
  expect(packets.map((packet) => [...packet.bytes])).toEqual([
    [...HEADER, 3, 255],
    [...HEADER, 5, MINI],
    [...HEADER, 4, MINI, 0, 1],
    [...HEADER, 4, MINI, 1, 200],
    [...HEADER, 4, MINI, 2, 0, 240],
    [...HEADER, 4, MINI, 3, 5],
    [...HEADER, 4, MINI, 4, 30],
    [
      ...HEADER,
      4,
      MINI,
      5,
      0x4d,
      0x69,
      0x6e,
      0x69,
      0x20,
      0x31,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ],
    [...HEADER, 4, MINI, 6, 0x0b, 0xb8],
  ]);
});

test('a listing asks twice and merges the replies by device ID', async () => {
  const node = await startConfigurer();
  const listing = node.configuration.getNodes();
  expect(node.sent()).toHaveLength(1);
  node.deliver(buildStatus(3, 20, { nickname: 'Mini 1' }));
  // Dropped: for another node, a color order the wire doesn't define, a source
  // that can't be a board, and the wrong length: 9.0.0's 31 bytes, and a byte
  // long
  node.deliver(buildStatus(4, 99));
  node.deliver(buildStatus(6, 20, { colorOrder: 6 }));
  node.deliver(buildStatus(240, 20));
  const status = buildStatus(5, 20);
  node.deliver(status.subarray(0, status.length - 2));
  node.deliver(Buffer.concat([status, Buffer.from([0])]));
  await node.advance(250);
  expect(node.sent()).toHaveLength(2);
  expect(node.sent()[1].bytes).toEqual(node.sent()[0].bytes);
  // Board 2 only heard the second query, and board 3 answers both
  node.deliver(buildStatus(2, 20, { capabilities: 0x6f, brightness: 200 }));
  node.deliver(buildStatus(3, 20, { nickname: 'Mini 1' }));
  await node.advance(750);
  const nodes = await listing;
  expect(nodes).toEqual([
    {
      deviceId: 2,
      capabilities: { ...ALL_CAPABILITIES, statusLedBrightness: false },
      channel: 0,
      brightness: 200,
      pixelCount: 300,
      colorOrder: 'GRB',
      statusLedBrightness: 60,
      nickname: '',
      currentLimit: 1500,
    },
    {
      deviceId: 3,
      capabilities: ALL_CAPABILITIES,
      channel: 0,
      brightness: 50,
      pixelCount: 300,
      colorOrder: 'GRB',
      statusLedBrightness: 60,
      nickname: 'Mini 1',
      currentLimit: 1500,
    },
  ]);
  // A reply after the window goes nowhere
  node.deliver(buildStatus(7, 20));
  expect(nodes).toHaveLength(2);
});

test('a configure resolves on the status carrying its value', async () => {
  const node = await startConfigurer();
  const request = node.configuration.configureNode(MINI, 'channel', 1);
  let settled = false;
  void request.then(() => {
    settled = true;
  });
  // A listing's answer from the same board with the old value, and another
  // board with the new one, are not it
  node.deliver(buildStatus(MINI, 20, { channel: 0 }));
  node.deliver(buildStatus(MINI + 1, 20, { channel: 1 }));
  await node.advance(10);
  expect(settled).toBe(false);
  node.deliver(buildStatus(MINI, 20, { channel: 1 }));
  const status = await request;
  expect(status.deviceId).toBe(MINI);
  expect(status.channel).toBe(1);
  expect(node.sent()).toHaveLength(1);
});

test('a nickname is matched as the board reports it', async () => {
  const node = await startConfigurer();
  const request = node.configuration.configureNode(MINI, 'nickname', 'left');
  node.deliver(buildStatus(MINI, 20, { nickname: 'left' }));
  expect((await request).nickname).toBe('left');
});

test('a property the board lacks resolves on its first status', async () => {
  const node = await startConfigurer();
  const request = node.configuration.configureNode(
    2,
    'statusLedBrightness',
    90
  );
  node.deliver(buildStatus(2, 20, { capabilities: 0x6f }));
  const status = await request;
  expect(status.capabilities.statusLedBrightness).toBe(false);
  expect(status.statusLedBrightness).toBe(60);
});

test('a request is sent once more after a second, and rejects after two', async () => {
  const node = await startConfigurer();
  const request = node.configuration.configureNode(MINI, 'pixelCount', 240);
  const rejection = expect(request).rejects.toThrow('Node 10 did not answer');
  expect(node.sent()).toHaveLength(1);
  await node.advance(999);
  expect(node.sent()).toHaveLength(1);
  await node.advance(1);
  expect(node.sent()).toHaveLength(2);
  expect(node.sent()[1].bytes).toEqual(node.sent()[0].bytes);
  await node.advance(999);
  expect(node.sent()).toHaveLength(2);
  await node.advance(1);
  await rejection;
});

test('a status after the resend resolves the request', async () => {
  const node = await startConfigurer();
  const request = node.configuration.identifyNode(MINI);
  await node.advance(1500);
  expect(node.sent()).toHaveLength(2);
  node.deliver(buildStatus(MINI, 20, { nickname: 'Mini 1' }));
  expect((await request).nickname).toBe('Mini 1');
});

test('an identify takes any status from its board, and rejects without one', async () => {
  const node = await startConfigurer();
  const answered = node.configuration.identifyNode(MINI);
  node.deliver(buildStatus(MINI + 1, 20));
  node.deliver(buildStatus(MINI, 20, { channel: 5 }));
  expect((await answered).channel).toBe(5);
  const unanswered = node.configuration.identifyNode(MINI + 2);
  const rejection = expect(unanswered).rejects.toThrow(
    'Node 12 did not answer'
  );
  // The resend is armed from a timer's continuation, so the clock moves in
  // two steps
  await node.advance(1000);
  await node.advance(1000);
  await rejection;
});

test('arguments a board would drop throw before anything is sent', async () => {
  const node = await startConfigurer();
  const { configureNode, identifyNode } = node.configuration;
  const idMessage = 'Device ID must be an integer between 0 and 239';
  expect(() => identifyNode(240)).toThrow(idMessage);
  expect(() => identifyNode(-1)).toThrow(idMessage);
  expect(() => configureNode(1.5, 'channel', 0)).toThrow(idMessage);
  expect(() => configureNode(MINI, 'channel', 8)).toThrow(
    'channel must be an integer between 0 and 7, got 8'
  );
  expect(() => configureNode(MINI, 'brightness', 256)).toThrow(
    'brightness must be an integer between 0 and 255, got 256'
  );
  expect(() => configureNode(MINI, 'pixelCount', 0)).toThrow(
    'pixelCount must be an integer between 1 and 300, got 0'
  );
  expect(() => configureNode(MINI, 'pixelCount', 301)).toThrow(
    'pixelCount must be an integer between 1 and 300, got 301'
  );
  expect(() => configureNode(MINI, 'pixelCount', 1.5)).toThrow(
    'pixelCount must be an integer between 1 and 300, got 1.5'
  );
  expect(() => configureNode(MINI, 'statusLedBrightness', -1)).toThrow(
    'statusLedBrightness must be an integer between 0 and 255, got -1'
  );
  expect(() => configureNode(MINI, 'currentLimit', 0)).toThrow(
    'currentLimit must be an integer between 1 and 65535, got 0'
  );
  expect(() => configureNode(MINI, 'currentLimit', 65536)).toThrow(
    'currentLimit must be an integer between 1 and 65535, got 65536'
  );
  expect(() => configureNode(MINI, 'currentLimit', 1.5)).toThrow(
    'currentLimit must be an integer between 1 and 65535, got 1.5'
  );
  // @ts-expect-error a JavaScript caller can pass any string
  expect(() => configureNode(MINI, 'colorOrder', 'RGBW')).toThrow(
    'colorOrder must be one of RGB, RBG, GRB, GBR, BRG, BGR, got RGBW'
  );
  expect(() => configureNode(MINI, 'nickname', 'a'.repeat(17))).toThrow(
    'nickname must be up to 16 printable ASCII characters'
  );
  expect(() => configureNode(MINI, 'nickname', 'Mini é')).toThrow(
    'nickname must be up to 16 printable ASCII characters'
  );
  // @ts-expect-error a JavaScript caller can pass a number
  expect(() => configureNode(MINI, 'nickname', 1)).toThrow(
    'nickname must be up to 16 printable ASCII characters'
  );
  // @ts-expect-error a JavaScript caller can pass any property name
  expect(() => configureNode(MINI, 'speed', 1)).toThrow(
    'Unknown property speed'
  );
  expect(node.sent()).toHaveLength(0);
});

test('nothing can be asked before connected', async () => {
  const node = await startNode();
  // An ID without the clock is not connected either
  node.assignId(20);
  const { configureNode, getNodes, identifyNode } = node.configuration;
  const message =
    'Not connected to the fleet yet. Wait for the connected event';
  expect(() => getNodes()).toThrow(message);
  expect(() => configureNode(MINI, 'channel', 1)).toThrow(message);
  expect(() => identifyNode(MINI)).toThrow(message);
});
