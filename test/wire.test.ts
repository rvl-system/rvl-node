import { expect, test } from 'vitest';

import { type AnimationParameters } from '../src/types.ts';
import { type Node, startNode } from './harness.ts';
import { RVLA_PORT } from './packets.ts';

// The golden fixture: what the sender writes for one off scene and one
// parametric scene, from device 20 on channel 3, spelled out from the wire
// layout. rvl-firmware's test/golden_packets.hpp holds the same bytes and
// test_animation parses them, so the two are kept in step by hand and change
// only when the wire does

const GOLDEN_OFF = Buffer.from([
  0x52, 0x56, 0x4c, 0x41, 0x02, 0x14, 0x01, 0x03, 0x00, 0x00, 0xfe, 0xdc, 0xba,
  0x00, 0xff,
]);

const GOLDEN_PARAMETRIC = Buffer.from([
  0x52, 0x56, 0x4c, 0x41, 0x02, 0x14, 0x04, 0x03, 0x00, 0x00, 0xab, 0xcd, 0xef,
  0x00, 0x28, 0xc8, 0x10, 0x64, 0xc8, 0xff, 0x01, 0xc0, 0x65, 0xc9, 0xfe, 0x02,
  0xc1, 0x66, 0xca, 0xfd, 0x03, 0xc2, 0x67, 0xcb, 0xfc, 0x04, 0xc3, 0x68, 0xcc,
  0xfb, 0x05, 0xc4, 0x69, 0xcd, 0xfa, 0x06, 0xc5, 0x6a, 0xce, 0xf9, 0x07, 0xc6,
  0x6b, 0xcf, 0xf8, 0x08, 0xc7, 0x6c, 0xd0, 0xf7, 0x09, 0xc8, 0x6d, 0xd1, 0xf6,
  0x0a, 0xc9, 0x6e, 0xd2, 0xf5, 0x0b, 0xca, 0x6f, 0xd3, 0xf4, 0x0c, 0xcb, 0x70,
  0xd4, 0xf3, 0x0d, 0xcc, 0x71, 0xd5, 0xf2, 0x0e, 0xcd, 0x72, 0xd6, 0xf1, 0x0f,
  0xce, 0x73, 0xd7, 0xf0, 0x10, 0xcf,
]);

// test_animation's distinctiveParametric(): every field different, and the
// signed ones negative
function distinctiveParametric(node: Node): AnimationParameters {
  let n = 0;
  const animations = [];
  for (let i = 0; i < 4; i++) {
    const layer = node.parametric.createEmptyAnimation();
    for (const component of [layer.h, layer.s, layer.v, layer.a]) {
      component.a = 100 + n;
      component.b = 200 + n;
      component.w_t = -1 - n;
      component.w_x = 1 + n;
      component.phi = -64 + n;
      n++;
    }
    animations.push(layer);
  }
  return { timePeriod: 200, distancePeriod: 16, animations };
}

async function startSender(): Promise<Node> {
  const node = await startNode();
  node.assignId(20);
  await node.syncClock();
  node.clearSent();
  return node;
}

test('an off scene is written as a board reads it', async () => {
  const node = await startSender();
  void node.animation.setOff(3, { startFrame: 0x00fedcba, fadeFrames: 255 });
  expect(node.sent()).toHaveLength(1);
  expect(node.sent()[0].port).toBe(RVLA_PORT);
  expect(node.sent()[0].bytes).toEqual(GOLDEN_OFF);
});

test('a parametric scene is written as a board reads it', async () => {
  const node = await startSender();
  void node.animation.setAnimationParameters(3, distinctiveParametric(node), {
    startFrame: 0x00abcdef,
    fadeFrames: 40,
  });
  expect(node.sent()).toHaveLength(1);
  expect(node.sent()[0].bytes).toEqual(GOLDEN_PARAMETRIC);
});

test('the periods default to 255 and 32', async () => {
  const node = await startSender();
  void node.animation.setAnimationParameters(0, { animations: [] });
  const [scene] = node.scenes();
  expect(scene.settings?.subarray(0, 2)).toEqual(Buffer.from([255, 32]));
  expect(scene.settings?.subarray(2)).toEqual(Buffer.alloc(80));
});

test('settings a board would drop throw instead', async () => {
  const node = await startSender();
  const empty = () => node.parametric.createEmptyAnimation();
  const send = (parameters: AnimationParameters) => {
    void node.animation.setAnimationParameters(0, parameters);
  };
  expect(() => {
    send({ animations: [empty(), empty(), empty(), empty(), empty()] });
  }).toThrow(/4 layers/);
  expect(() => {
    send({ timePeriod: 0, animations: [] });
  }).toThrow(/from 1 to 255/);
  expect(() => {
    send({ distancePeriod: 256, animations: [] });
  }).toThrow(/from 1 to 255/);
  const tooBright = empty();
  tooBright.v.b = 256;
  expect(() => {
    send({ animations: [tooBright] });
  }).toThrow(/from 0 to 255/);
  const tooFast = empty();
  tooFast.a.w_t = 128;
  expect(() => {
    send({ animations: [tooFast] });
  }).toThrow(/from -128 to 127/);
  expect(node.scenes()).toEqual([]);
});
