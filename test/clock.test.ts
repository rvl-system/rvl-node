import { beforeEach, expect, test } from 'vitest';

import { subtractFrames } from '../src/clock.ts';
import { type Node, startNode } from './harness.ts';
import { buildObservation, buildReference, FIRST_BOARD } from './packets.ts';

// Mirrors test_clock_sync and test_frames in rvl-firmware, by name where the
// behavior is shared, fed through the socket as the coordinator and the boards
// feed a board. rvl-node's own observation is never in the median, so rows
// with few boards average differently than on a board

// Frame numbers run 0..FRAME_COUNT - 1, and subtractFrames's range is half of
// that either side of zero
const FRAME_COUNT = 2 ** 27;
const HALF = 2 ** 26;

let node: Node;

beforeEach(async () => {
  node = await startNode();
});

// The offset is 0 until the first sync, and reading the clock throws until
// then
function readOffset(): number {
  try {
    return node.clock.toAnimationClock(0);
  } catch {
    return 0;
  }
}

// At local time `time`, the coordinator's reference `id`, then boards from
// firstPeer up each observing it at this node's observed time plus their delta
async function row(
  time: number,
  id: number,
  startOfSet: boolean,
  deltas: number[],
  firstPeer = FIRST_BOARD
): Promise<void> {
  await node.advance(time - node.now());
  node.deliver(buildReference(id, startOfSet));
  observations(id, (time + readOffset()) >>> 0, deltas, firstPeer);
}

function observations(
  id: number,
  observed: number,
  deltas: number[],
  firstPeer = FIRST_BOARD
): void {
  deltas.forEach((delta, i) => {
    node.deliver(buildObservation(firstPeer + i, id, (observed + delta) >>> 0));
  });
}

// Starts the next set at local time `time`, which processes the current one
async function processSet(time: number, id: number): Promise<number> {
  const before = readOffset();
  await node.advance(time - node.now());
  node.deliver(buildReference(id, true));
  return (readOffset() - before) | 0;
}

// A first set that moves the offset by correction, so the test goes on synced
async function syncClock(correction = 0): Promise<void> {
  await row(1000, 0, true, [correction, correction]);
  await processSet(1100, 1);
}

test('each row takes the upper median', async () => {
  await syncClock();
  await row(2000, 1, false, [10, 20, 30]);
  await row(2100, 2, false, [10, 20, 30]);
  expect(await processSet(4000, 3)).toBe(20);
});

test('rows with mixed numbers of observations are averaged', async () => {
  await row(1000, 0, true, [10, 20, 30]);
  await row(1100, 1, false, [10, 50]);
  await row(1200, 2, false, [60]);
  // A board's own 0 would make the middle row's median 10 and the average 30
  expect(await processSet(3300, 3)).toBe(43);
});

test('the start of set observation uses the corrected clock', async () => {
  await row(1000, 0, true, [20, 20]);
  await row(1100, 1, false, [20, 20]);
  await row(1200, 2, false, [20, 20]);
  expect(await processSet(3300, 3)).toBe(20);
  // Boards that observed reference 3 on the corrected clock agree with it
  observations(3, 3300 + 20, [0, 0]);
  await row(3400, 4, false, [0, 0]);
  await row(3500, 5, false, [0, 0]);
  expect(await processSet(5600, 6)).toBe(0);
});

test('a row is discarded when this node missed its reference', async () => {
  await row(1000, 0, true, [20, 20]);
  observations(1, 1100, [90, 90]);
  await row(1200, 2, false, [20, 20]);
  expect(await processSet(3300, 3)).toBe(20);
});

// A set whose start this node missed is never processed, so its rows still
// hold data when the next set reuses them
test('a reused row is cleared of an older reference', async () => {
  const stale = [1000, 1000, 1000, 1000, 1000];
  await row(1000, 0, true, stale, FIRST_BOARD + 10);
  await row(1100, 1, false, stale, FIRST_BOARD + 10);
  await row(1200, 2, false, stale, FIRST_BOARD + 10);
  observations(3, 3300, [20, 20]);
  await row(3400, 4, false, [20, 20]);
  await row(3500, 5, false, [20, 20]);
  expect(await processSet(5600, 6)).toBe(20);
});

test('a lone rvl-node syncs with a zero correction', async () => {
  await row(1000, 0, true, []);
  await row(1100, 1, false, []);
  await row(1200, 2, false, []);
  expect(() => node.clock.getAnimationClock()).toThrow();
  expect(await processSet(3300, 3)).toBe(0);
  expect(() => node.clock.getAnimationClock()).not.toThrow();
});

// Every board's observation of the middle reference was lost, so that row
// would otherwise pull the correction toward this node's own clock
test('a row no other node observed is discarded when others were', async () => {
  await row(1000, 0, true, [20, 20]);
  await row(1100, 1, false, []);
  await row(1200, 2, false, [20, 20]);
  expect(await processSet(3300, 3)).toBe(20);
});

test('a cold start against a long-running fleet', async () => {
  const fleetAhead = 2999990000;
  const delta = fleetAhead | 0;
  await row(1000, 0, true, [delta, delta]);
  await row(1100, 1, false, [delta, delta]);
  await row(1200, 2, false, [delta, delta]);
  expect((await processSet(3300, 3)) >>> 0).toBe(fleetAhead);
});

// Reference 3 reuses reference 0's row, so an observation of 0 arriving after
// it clears the row, taking this node's observation of 3 with it. Known bug,
// deferred to Phase 3
test.skip('a straggler from the last set keeps this sets row', async () => {
  await row(1000, 0, true, [0]);
  await row(1100, 1, false, [0]);
  await row(1200, 2, false, [0]);
  await node.advance(3300 - node.now());
  node.deliver(buildReference(3, true));
  const observed = (3300 + readOffset()) >>> 0;
  observations(0, observed, [0], FIRST_BOARD + 10);
  observations(3, observed, [30, 30]);
  await row(3400, 4, false, [0, 0]);
  await row(3500, 5, false, [0, 0]);
  expect(await processSet(5600, 6)).toBe(10);
});

test('packets from a source of 240 and up or this nodes own ID are dropped', async () => {
  node.assignId(10);
  await row(1000, 0, true, [20]);
  const own = (1000 + readOffset()) >>> 0;
  node.deliver(buildObservation(240, 0, own + 90));
  node.deliver(buildObservation(10, 0, own + 90));
  await row(1100, 1, false, [20]);
  // References this node can't have observed leave their rows discarded
  await node.advance(100);
  node.deliver(buildReference(2, false, 240));
  node.deliver(buildReference(2, false, 10));
  observations(2, 1200, [90]);
  expect(await processSet(3300, 3)).toBe(20);
});

test('the animation clock wraps with its offset', async () => {
  await syncClock(-0x100);
  expect(readOffset()).toBe(0xffffff00);
  expect(node.clock.toAnimationClock(0x200)).toBe(0x100);
  for (const clock of [0, 0x100, 0x7fffffff, 0xffffff80]) {
    const localTime = node.clock.toLocalTime(clock);
    expect(node.clock.toAnimationClock(localTime)).toBe(clock);
    expect(Math.abs(localTime - node.now())).toBeLessThanOrEqual(2 ** 31);
  }
});

test('the first sync resolves the wait for it', async () => {
  let synced = false;
  const waiting = node.clock.waitForClockSync().then(() => {
    synced = true;
  });
  await row(1000, 0, true, [5000, 5000]);
  expect(synced).toBe(false);
  await processSet(1100, 1);
  await waiting;
  expect(synced).toBe(true);
  await node.clock.waitForClockSync();
  expect(node.clock.getAnimationClock()).toBe(1100 + 5000);
});

test('the fleet clock is unreadable before the first sync', () => {
  expect(() => node.clock.getAnimationClock()).toThrow(/not synchronized/);
  expect(() => node.clock.getAnimationFrame()).toThrow(/not synchronized/);
  expect(() => node.clock.toAnimationClock(0)).toThrow(/not synchronized/);
  expect(() => node.clock.toLocalTime(0)).toThrow(/not synchronized/);
});

test('frame differences are signed', () => {
  expect(subtractFrames(7, 7)).toBe(0);
  expect(subtractFrames(7, 5)).toBe(2);
  expect(subtractFrames(5, 7)).toBe(-2);
});

test('a frame past the wrap is one ahead', () => {
  expect(subtractFrames(0, FRAME_COUNT - 1)).toBe(1);
  expect(subtractFrames(FRAME_COUNT - 1, 0)).toBe(-1);
});

test('the signed range is half the cycle', () => {
  expect(subtractFrames(HALF - 1, 0)).toBe(HALF - 1);
  expect(subtractFrames(HALF, 0)).toBe(-HALF);
  expect(subtractFrames(0, HALF)).toBe(-HALF);
  expect(subtractFrames(0, HALF + 1)).toBe(HALF - 1);
  expect(subtractFrames(0, HALF - 1)).toBe(-(HALF - 1));
});

test('differences hold from any frame', () => {
  const bases = [0, 1, HALF - 1, HALF, FRAME_COUNT - 1];
  const deltas = [-HALF, -HALF + 1, -1, 0, 1, HALF - 2, HALF - 1];
  for (const base of bases) {
    for (const delta of deltas) {
      const frame =
        (((base + delta) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
      expect(subtractFrames(frame, base), `base ${base}, delta ${delta}`).toBe(
        delta
      );
    }
  }
});

// A sum like start + fade can pass FRAME_COUNT without being masked, and still
// compares correctly with a frame that has wrapped
test('an unmasked sum compares with a wrapped frame', () => {
  const end = FRAME_COUNT - 10 + 16;
  expect(subtractFrames(end, 3)).toBe(3);
  expect(subtractFrames(3, end)).toBe(-3);
});
