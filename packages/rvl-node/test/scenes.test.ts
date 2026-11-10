import { beforeEach, expect, test } from 'vitest';

import { DEFAULT_FADE_FRAMES } from '../src/config.ts';
import { type Node, startNode } from './harness.ts';
import { type SentScene } from './packets.ts';

// The sender, driven through setAnimationParameters, setOff and
// getEarliestStartFrame, name for name with test_scenes in rvl-firmware where
// the behavior is shared. What a board would see is read off the wire: a send
// carries current then pending, with each scene's start and fade

const CHANNEL = 0;
const LEAD = 5;
const FRAME = 32;
const LAST_FRAME = 2 ** 27 - 1;

let node: Node;

// Synced at frame 0, a millisecond past its tick, so whole frames land after
// each tick
beforeEach(async () => {
  node = await startNode();
  node.assignId(20);
  await node.syncClock();
  await node.advance(1);
  node.clearSent();
});

async function advanceFrames(count: number): Promise<void> {
  await node.advance(count * FRAME);
}

// Contents told apart by one hue, which readId() reads back; off reads as -1
function wave(id: number) {
  return node.parametric.createAnimationParameters(
    node.parametric.createSolidColorAnimation(id, 255, 255)
  );
}

function readId(scene: SentScene): number {
  return scene.settings ? scene.settings[3] : -1;
}

function setScene(
  id: number,
  options?: { startFrame?: number; fadeFrames?: number }
): Promise<void> {
  return node.animation.setAnimationParameters(CHANNEL, wave(id), options);
}

// What the sends since the last clear carried, as [id, start, fade]
function sentScenes(): [number, number, number][] {
  return node.scenes().map((scene) => [readId(scene), scene.start, scene.fade]);
}

function earliest(): number | undefined {
  return node.animation.getEarliestStartFrame(CHANNEL);
}

// Whether a call's promise has resolved, read after the harness's flushes
function track(promise: Promise<void>): () => boolean {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  return () => settled;
}

test('a controllers change starts a lead from now', async () => {
  const n = node.frame();
  const settled = track(setScene(1));
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
  node.clearSent();
  await advanceFrames(3);
  expect(sentScenes()).toEqual([]);
  expect(settled()).toBe(false);
  await advanceFrames(1);
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
  expect(settled()).toBe(true);
  // Then about once a second
  node.clearSent();
  await advanceFrames(31);
  expect(sentScenes()).toEqual([]);
  await advanceFrames(1);
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('changes during the lead and fade are held and the last wins', async () => {
  const n = node.frame();
  void setScene(1);
  await advanceFrames(2);
  void setScene(2);
  void setScene(3);
  const fadeEnd = n + LEAD + DEFAULT_FADE_FRAMES;
  await advanceFrames(fadeEnd - 1 - node.frame());
  expect(sentScenes().every(([id]) => id === 1)).toBe(true);
  node.clearSent();
  await advanceFrames(1);
  expect(sentScenes()).toEqual([
    [1, n + LEAD, DEFAULT_FADE_FRAMES],
    [3, fadeEnd + LEAD, DEFAULT_FADE_FRAMES],
  ]);
});

// Fake timers fire every tick at its boundary, so the tick is made late by a
// sub-frame correction that moves the clock under it after it was armed
test('the gate opens in a late iteration too', async () => {
  const n = node.frame();
  void setScene(1);
  void setScene(2);
  const fadeEnd = n + LEAD + DEFAULT_FADE_FRAMES;
  await advanceFrames(fadeEnd - 1 - node.frame());
  await node.advance(10);
  await node.syncClock(31);
  node.clearSent();
  await node.advance(FRAME - 10);
  expect(node.frame()).toBe(fadeEnd + 1);
  expect(sentScenes()).toEqual([
    [1, n + LEAD, DEFAULT_FADE_FRAMES],
    [2, fadeEnd + 1 + LEAD, DEFAULT_FADE_FRAMES],
  ]);
});

test('off on an off strip and a dial turned back do nothing', async () => {
  void node.animation.setOff(CHANNEL);
  await advanceFrames(30);
  node.clearSent();
  const offAgain = track(node.animation.setOff(CHANNEL));
  await node.advance(0);
  expect(sentScenes()).toEqual([]);
  expect(offAgain()).toBe(true);

  void setScene(1);
  await advanceFrames(30);
  node.clearSent();
  const sameScene = track(setScene(1));
  await node.advance(0);
  expect(sentScenes()).toEqual([]);
  expect(sameScene()).toBe(true);
});

test('a request back to the pending scene clears the held one', async () => {
  void setScene(1);
  void setScene(2);
  void setScene(1);
  await advanceFrames(60);
  expect(sentScenes().every(([id]) => id === 1)).toBe(true);
  expect(earliest()).toBe(node.frame() + LEAD);
});

test('a request back to the fading scene clears the held one', async () => {
  void setScene(1);
  await advanceFrames(LEAD + 2);
  void setScene(2);
  void setScene(1);
  await advanceFrames(60);
  expect(sentScenes().every(([id]) => id === 1)).toBe(true);
  expect(earliest()).toBe(node.frame() + LEAD);
});

test('repeating the held request holds it', async () => {
  const n = node.frame();
  void setScene(1);
  void setScene(2);
  void setScene(2);
  await advanceFrames(60);
  expect(sentScenes().at(-1)).toEqual([
    2,
    n + LEAD + DEFAULT_FADE_FRAMES + LEAD,
    DEFAULT_FADE_FRAMES,
  ]);
});

// A board's held request takes the default fade; a caller's keeps the fade it
// asked for
test('a held request is released with its own fade', async () => {
  const n = node.frame();
  void setScene(1);
  void setScene(2, { fadeFrames: 40 });
  const fadeEnd = n + LEAD + DEFAULT_FADE_FRAMES;
  await advanceFrames(fadeEnd - node.frame());
  expect(sentScenes().at(-1)).toEqual([2, fadeEnd + LEAD, 40]);
});

test('off as a channels first call schedules off', () => {
  const n = node.frame();
  void node.animation.setOff(CHANNEL);
  expect(node.scenes()[0].type).toBe('off');
  expect(sentScenes()).toEqual([[-1, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('a call before the first sync is held and released at the lead after it', async () => {
  node = await startNode();
  node.assignId(20);
  node.clearSent();
  const first = track(setScene(1));
  await node.advance(0);
  expect(first()).toBe(true);
  expect(node.warn).toHaveBeenCalledTimes(1);
  expect(node.warn.mock.calls[0][0]).toMatch(/not synchronized/);
  void setScene(2);
  expect(node.warn).toHaveBeenCalledTimes(1);
  await node.advance(10000);
  void setScene(3);
  expect(node.warn).toHaveBeenCalledTimes(2);
  expect(() => setScene(4, { startFrame: 100 })).toThrow(/fleet clock/);
  expect(() => earliest()).toThrow(/not synchronized/);
  expect(sentScenes()).toEqual([]);

  await node.syncClock();
  const n = node.frame();
  expect(sentScenes()).toEqual([[3, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('an explicit start can be one frame short of the lead, not two', () => {
  const n = node.frame();
  expect(earliest()).toBe(n + LEAD);
  expect(() => setScene(1, { startFrame: n + LEAD - 2 })).toThrow(/earliest/);
  void setScene(1, { startFrame: n + LEAD - 1 });
  expect(sentScenes()).toEqual([[1, n + LEAD - 1, DEFAULT_FADE_FRAMES]]);
});

// A frame boundary between the two calls would otherwise make the start the
// caller just read one frame too early
test('an earliest start read in the previous frame is still taken', async () => {
  const n = node.frame();
  const start = earliest() ?? 0;
  await node.advance(FRAME - 1);
  expect(node.frame()).toBe(n + 1);
  expect(earliest()).toBe(start + 1);
  void setScene(1, { startFrame: start });
  expect(sentScenes()).toEqual([[1, start, DEFAULT_FADE_FRAMES]]);
});

test('the slack never reaches into a running fade', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + LEAD, fadeFrames: 64 });
  const fadeEnd = n + LEAD + 64;
  // Where the lead from now meets the end, the end still binds
  await advanceFrames(fadeEnd - LEAD - node.frame());
  expect(earliest()).toBe(fadeEnd);
  expect(() => setScene(2, { startFrame: fadeEnd - 1 })).toThrow(/earliest/);
  // A frame on, the lead passes the end, and the slack reaches back to the
  // end and no further
  await advanceFrames(1);
  expect(earliest()).toBe(fadeEnd + 1);
  node.clearSent();
  void setScene(2, { startFrame: fadeEnd });
  expect(sentScenes().at(-1)).toEqual([2, fadeEnd, DEFAULT_FADE_FRAMES]);
});

test('an explicit start waits out a running fade', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + LEAD, fadeFrames: 64 });
  await advanceFrames(LEAD);
  const fadeEnd = n + LEAD + 64;
  expect(earliest()).toBe(fadeEnd);
  expect(() => setScene(2, { startFrame: fadeEnd - 1 })).toThrow(/earliest/);
  node.clearSent();
  void setScene(2, { startFrame: fadeEnd });
  expect(sentScenes()).toEqual([
    [1, n + LEAD, 64],
    [2, fadeEnd, DEFAULT_FADE_FRAMES],
  ]);
});

// The three starts a narrower rule would let through: inside pending's fade,
// between the fades, and past pending's fade
test('an explicit start throws while a scene is pending', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + LEAD, fadeFrames: 32 });
  await advanceFrames(LEAD);
  void setScene(2, { startFrame: n + 100, fadeFrames: 32 });
  expect(earliest()).toBeUndefined();
  for (const startFrame of [n + 50, n + 110, n + 200]) {
    expect(() => setScene(3, { startFrame })).toThrow(/already scheduled/);
  }
  node.clearSent();
  await advanceFrames(100 - LEAD);
  expect(sentScenes().at(-1)).toEqual([2, n + 100, 32]);
});

test('an explicit start throws over a held request', async () => {
  const n = node.frame();
  void setScene(1);
  await advanceFrames(LEAD);
  void setScene(2);
  expect(earliest()).toBeUndefined();
  expect(() => setScene(3, { startFrame: n + 100 })).toThrow(
    /already scheduled/
  );
});

// The tick runs a millisecond into the frame and would promote first, so the
// call is made on the boundary itself
test('a call in the frame pending comes due sees it as current', async () => {
  const n = node.frame();
  void setScene(1);
  await node.advance(LEAD * FRAME - 1);
  expect(node.frame()).toBe(n + LEAD);
  node.clearSent();
  void setScene(2, { startFrame: n + LEAD + DEFAULT_FADE_FRAMES });
  expect(sentScenes()).toEqual([
    [1, n + LEAD, DEFAULT_FADE_FRAMES],
    [2, n + LEAD + DEFAULT_FADE_FRAMES, DEFAULT_FADE_FRAMES],
  ]);
});

// Promises belong to the channel: while a request is held, every call on the
// channel waits for the scene that finally goes out
test('a replaced or dropped request settles at the repeat of the scene that goes out', async () => {
  const n = node.frame();
  const first = track(setScene(1));
  await advanceFrames(1);
  const second = track(setScene(2));
  const third = track(setScene(3));
  const fadeEnd = n + LEAD + DEFAULT_FADE_FRAMES;
  await advanceFrames(fadeEnd + 4 - 1 - node.frame());
  expect(first()).toBe(false);
  expect(second()).toBe(false);
  expect(third()).toBe(false);
  await advanceFrames(1);
  expect(first()).toBe(true);
  expect(second()).toBe(true);
  expect(third()).toBe(true);

  // Dropped by a step, re-scheduled by the hook, settled at that repeat
  const fourth = track(setScene(4));
  await node.syncClock(2 * FRAME);
  await advanceFrames(3);
  expect(fourth()).toBe(false);
  await advanceFrames(1);
  expect(fourth()).toBe(true);
});

test('content equal to a scene just scheduled waits for its repeat', async () => {
  void setScene(1);
  await advanceFrames(1);
  const same = track(setScene(1));
  await advanceFrames(2);
  expect(same()).toBe(false);
  await advanceFrames(1);
  expect(same()).toBe(true);
});

test('a scene with no device ID is sent once the ID arrives', async () => {
  node = await startNode();
  await node.syncClock();
  await node.advance(1);
  node.clearSent();
  const n = node.frame();
  const settled = track(setScene(1));
  await advanceFrames(3);
  expect(settled()).toBe(false);
  await advanceFrames(1);
  expect(settled()).toBe(true);
  expect(node.sent().every((packet) => packet.port === 4979)).toBe(true);

  node.assignId(20);
  node.clearSent();
  await advanceFrames(32);
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('a correction under a frame leaves the repeat at its local time', async () => {
  const n = node.frame();
  void setScene(1);
  await node.advance(9);
  await node.syncClock(-20);
  node.clearSent();
  // Due at the boundary four frames on, 129, which no tick has reached yet
  await node.advance(128 - node.now());
  expect(sentScenes()).toEqual([]);
  await node.advance(21);
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('a step re-sends at once and repeats four frames after it', async () => {
  const n = node.frame();
  void setScene(1);
  await advanceFrames(1);
  node.clearSent();
  await node.syncClock(2 * FRAME);
  expect(node.frame()).toBe(n + 3);
  expect(sentScenes()).toEqual([[1, n + 3 + LEAD, DEFAULT_FADE_FRAMES]]);
  node.clearSent();
  await node.advance(127);
  expect(sentScenes()).toEqual([]);
  await node.advance(1);
  expect(sentScenes()).toEqual([[1, n + 3 + LEAD, DEFAULT_FADE_FRAMES]]);
});

test('a step reschedules the held request over pending', async () => {
  const n = node.frame();
  void setScene(1);
  void setScene(2, { fadeFrames: 40 });
  node.clearSent();
  await node.syncClock(3 * FRAME);
  expect(sentScenes()).toEqual([[2, n + 3 + LEAD, 40]]);
});

test('a step reschedules pending with its own fade', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + 30, fadeFrames: 40 });
  node.clearSent();
  await node.syncClock(2 * FRAME);
  expect(sentScenes()).toEqual([[1, n + 2 + LEAD, 40]]);
});

// Identical content, so when it comes due nothing dissolves and the gate is
// open at once
test('a step reschedules current with its own fade', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + LEAD, fadeFrames: 24 });
  await advanceFrames(30);
  node.clearSent();
  await node.syncClock(-2 * FRAME);
  const f = n + 28;
  expect(node.frame()).toBe(f);
  expect(sentScenes()).toEqual([
    [1, n + LEAD, 24],
    [1, f + LEAD, 24],
  ]);
  await advanceFrames(LEAD);
  expect(earliest()).toBe(node.frame() + LEAD);
});

// This node's own fleet would otherwise hold its re-scheduled scene under the
// overlap rule
test('a step during a fade reschedules at the fades end', async () => {
  const n = node.frame();
  void setScene(1, { startFrame: n + LEAD, fadeFrames: 32 });
  await advanceFrames(LEAD + 2);
  node.clearSent();
  await node.syncClock(3 * FRAME);
  expect(sentScenes().at(-1)).toEqual([1, n + LEAD + 32 + 3, 32]);
});

test('a step on a channel with no scene does nothing', async () => {
  await node.syncClock(2 * FRAME);
  await advanceFrames(40);
  expect(node.scenes()).toEqual([]);
});

test('a correction under a frame changes nothing', async () => {
  const n = node.frame();
  void setScene(1);
  node.clearSent();
  await node.syncClock(FRAME - 1);
  expect(sentScenes()).toEqual([]);
  await advanceFrames(5);
  expect(sentScenes()).toEqual([[1, n + LEAD, DEFAULT_FADE_FRAMES]]);
});

// Driven by a day of ticks, so this is the slow one
test('a controller rekeys a scene older than a day', async () => {
  const n = node.frame();
  void setScene(1);
  await advanceFrames(30);
  const rekeyFrame = n + LEAD + 2700001;
  await node.advance(rekeyFrame * FRAME - node.now());
  node.clearSent();
  await node.advance(1);
  expect(node.frame()).toBe(rekeyFrame);
  expect(sentScenes()).toEqual([
    [1, n + LEAD, DEFAULT_FADE_FRAMES],
    [1, rekeyFrame + LEAD, DEFAULT_FADE_FRAMES],
  ]);

  // An explicit start replaces a pending re-key
  expect(earliest()).toBe(rekeyFrame + LEAD);
  node.clearSent();
  void setScene(2, { startFrame: rekeyFrame + 10 });
  expect(sentScenes()).toEqual([
    [1, n + LEAD, DEFAULT_FADE_FRAMES],
    [2, rekeyFrame + 10, DEFAULT_FADE_FRAMES],
  ]);
});

// The fleet clock is put ten frames short of the 2^27 wrap by the first sync
async function syncNearTheWrap(): Promise<Node> {
  const near = await startNode();
  near.assignId(20);
  await near.advance(1);
  await near.syncClock((LAST_FRAME - 10) * FRAME - 1);
  near.clearSent();
  return near;
}

test('scenes and fades cross the frame wrap', async () => {
  node = await syncNearTheWrap();
  expect(node.frame()).toBe(LAST_FRAME - 10);
  void setScene(1, { startFrame: LAST_FRAME - 5, fadeFrames: 32 });
  await advanceFrames(5);
  // Masked, as a sender that wraps its frame numbers would send it
  expect(() =>
    setScene(2, { startFrame: (LAST_FRAME + 26) & LAST_FRAME })
  ).toThrow(/earliest/);
  // LAST_FRAME + 30 is frame 29 of the next cycle
  void setScene(2, { startFrame: (LAST_FRAME + 30) & LAST_FRAME });
  await advanceFrames(34);
  expect(node.frame()).toBe(28);
  node.clearSent();
  await advanceFrames(1);
  expect(earliest()).toBe(29 + DEFAULT_FADE_FRAMES);
  await advanceFrames(32);
  expect(sentScenes().at(-1)).toEqual([2, 29, DEFAULT_FADE_FRAMES]);
});

test('a step across the frame wrap keeps the fade', async () => {
  node = await syncNearTheWrap();
  void setScene(1, { startFrame: LAST_FRAME - 5, fadeFrames: 64 });
  await advanceFrames(8);
  const left = node.clock.subtractFrames(earliest() ?? 0, node.frame());
  node.clearSent();
  await node.syncClock(10 * FRAME);
  expect(node.frame()).toBe(7);
  expect(node.clock.subtractFrames(earliest() ?? 0, node.frame())).toBe(left);
  // The re-scheduled copy waits for that fade's end, 68 frames into the cycle
  const [, rescheduled] = sentScenes();
  expect(node.clock.subtractFrames(rescheduled[1], 68)).toBe(0);
});

test('bad arguments throw at the call', () => {
  expect(() => node.animation.setOff(8)).toThrow(/Channel/);
  for (const fadeFrames of [15, 256, 16.5]) {
    expect(() => setScene(1, { fadeFrames })).toThrow(/fadeFrames/);
  }
  for (const startFrame of [-1, 2 ** 32, 1.5]) {
    expect(() => setScene(1, { startFrame })).toThrow(/startFrame/);
  }
  expect(node.scenes()).toEqual([]);
});
