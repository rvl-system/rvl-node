import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  _testOnlyResetClockSync,
  getAnimationClock,
  handleObservation,
  handleReference,
  subtractFrames,
  toAnimationClock,
  toLocalTime,
  waitForClockSync,
} from '../src/clock.ts';

// Mirrors test_clock_sync and test_frames in rvl-firmware, by name where the
// behavior is shared. rvl-node's own observation is never in the median, so
// rows with few boards average differently than on a board

const FIRST_PEER = 20;

// Frame numbers run 0..FRAME_COUNT - 1, and subtractFrames's range is half of
// that either side of zero
const FRAME_COUNT = 2 ** 27;
const HALF = 2 ** 26;

beforeEach(_testOnlyResetClockSync);

// The offset is 0 until the first sync, and reading the clock throws until
// then
function readOffset(): number {
  try {
    return toAnimationClock(0);
  } catch {
    return 0;
  }
}

// Boards from firstPeer up each report observing reference id at this node's
// observed time plus their delta
function row(
  time: number,
  id: number,
  startOfSet: boolean,
  deltas: number[],
  firstPeer = FIRST_PEER
): void {
  handleReference(id, startOfSet, time);
  observations(id, (time + readOffset()) >>> 0, deltas, firstPeer);
}

function observations(
  id: number,
  observed: number,
  deltas: number[],
  firstPeer = FIRST_PEER
): void {
  deltas.forEach((delta, i) => {
    handleObservation(id, firstPeer + i, (observed + delta) >>> 0);
  });
}

// Starts the next set, which processes the current one
function processSet(time: number, id: number): number {
  const before = readOffset();
  handleReference(id, true, time);
  return (readOffset() - before) | 0;
}

// A first set that moves the offset by correction, so the test goes on synced
function syncClock(correction = 0): void {
  row(1000, 0, true, [correction, correction]);
  processSet(1100, 1);
}

test('each row takes the upper median', () => {
  syncClock();
  row(2000, 1, false, [10, 20, 30]);
  row(2100, 2, false, [10, 20, 30]);
  assert.equal(processSet(4000, 3), 20);
});

test('rows with mixed numbers of observations are averaged', () => {
  row(1000, 0, true, [10, 20, 30]);
  row(1100, 1, false, [10, 50]);
  row(1200, 2, false, [60]);
  // A board's own 0 would make the middle row's median 10 and the average 30
  assert.equal(processSet(3300, 3), 43);
});

test('the start of set observation uses the corrected clock', () => {
  row(1000, 0, true, [20, 20]);
  row(1100, 1, false, [20, 20]);
  row(1200, 2, false, [20, 20]);
  assert.equal(processSet(3300, 3), 20);
  // Boards that observed reference 3 on the corrected clock agree with it
  observations(3, 3300 + 20, [0, 0]);
  row(3400, 4, false, [0, 0]);
  row(3500, 5, false, [0, 0]);
  assert.equal(processSet(5600, 6), 0);
});

test('a row is discarded when this node missed its reference', () => {
  row(1000, 0, true, [20, 20]);
  observations(1, 1100, [90, 90]);
  row(1200, 2, false, [20, 20]);
  assert.equal(processSet(3300, 3), 20);
});

// A set whose start this node missed is never processed, so its rows still
// hold data when the next set reuses them
test('a reused row is cleared of an older reference', () => {
  const stale = [1000, 1000, 1000, 1000, 1000];
  row(1000, 0, true, stale, FIRST_PEER + 10);
  row(1100, 1, false, stale, FIRST_PEER + 10);
  row(1200, 2, false, stale, FIRST_PEER + 10);
  observations(3, 3300, [20, 20]);
  row(3400, 4, false, [20, 20]);
  row(3500, 5, false, [20, 20]);
  assert.equal(processSet(5600, 6), 20);
});

test('a lone rvl-node syncs with a zero correction', () => {
  row(1000, 0, true, []);
  row(1100, 1, false, []);
  row(1200, 2, false, []);
  assert.throws(() => getAnimationClock());
  assert.equal(processSet(3300, 3), 0);
  assert.doesNotThrow(() => getAnimationClock());
});

// Every board's observation of the middle reference was lost, so that row
// would otherwise pull the correction toward this node's own clock
test('a row no other node observed is discarded when others were', () => {
  row(1000, 0, true, [20, 20]);
  row(1100, 1, false, []);
  row(1200, 2, false, [20, 20]);
  assert.equal(processSet(3300, 3), 20);
});

test('a cold start against a long-running fleet', () => {
  const fleetAhead = 2999990000;
  const delta = fleetAhead | 0;
  row(1000, 0, true, [delta, delta]);
  row(1100, 1, false, [delta, delta]);
  row(1200, 2, false, [delta, delta]);
  assert.equal(processSet(3300, 3) >>> 0, fleetAhead);
});

// Reference 3 reuses reference 0's row, so an observation of 0 arriving after
// it clears the row, taking this node's observation of 3 with it
test(
  'a straggler from the last set keeps this sets row',
  { skip: 'Known bug, deferred to Phase 3' },
  () => {
    row(1000, 0, true, [0]);
    row(1100, 1, false, [0]);
    row(1200, 2, false, [0]);
    handleReference(3, true, 3300);
    const observed = (3300 + readOffset()) >>> 0;
    observations(0, observed, [0], FIRST_PEER + 10);
    observations(3, observed, [30, 30]);
    row(3400, 4, false, [0, 0]);
    row(3500, 5, false, [0, 0]);
    assert.equal(processSet(5600, 6), 10);
  }
);

test('the animation clock wraps with its offset', () => {
  syncClock(-0x100);
  assert.equal(readOffset(), 0xffffff00);
  assert.equal(toAnimationClock(0x200), 0x100);
  for (const clock of [0, 0x100, 0x7fffffff, 0xffffff80]) {
    const localTime = toLocalTime(clock);
    assert.equal(toAnimationClock(localTime), clock);
    assert.ok(Math.abs(localTime - performance.now()) <= 2 ** 31);
  }
});

test('the first sync resolves the wait for it', async () => {
  let synced = false;
  const waiting = waitForClockSync().then(() => {
    synced = true;
  });
  row(1000, 0, true, [5000, 5000]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(synced, false);

  processSet(1100, 1);
  await waiting;
  assert.equal(synced, true);
  await waitForClockSync();
});

test('the fleet clock is unreadable before the first sync', () => {
  assert.throws(() => getAnimationClock(), /not synchronized/);
  assert.throws(() => toAnimationClock(0), /not synchronized/);
  assert.throws(() => toLocalTime(0), /not synchronized/);
});

test('frame differences are signed', () => {
  assert.equal(subtractFrames(7, 7), 0);
  assert.equal(subtractFrames(7, 5), 2);
  assert.equal(subtractFrames(5, 7), -2);
});

test('a frame past the wrap is one ahead', () => {
  assert.equal(subtractFrames(0, FRAME_COUNT - 1), 1);
  assert.equal(subtractFrames(FRAME_COUNT - 1, 0), -1);
});

test('the signed range is half the cycle', () => {
  assert.equal(subtractFrames(HALF - 1, 0), HALF - 1);
  assert.equal(subtractFrames(HALF, 0), -HALF);
  assert.equal(subtractFrames(0, HALF), -HALF);
  assert.equal(subtractFrames(0, HALF + 1), HALF - 1);
  assert.equal(subtractFrames(0, HALF - 1), -(HALF - 1));
});

test('differences hold from any frame', () => {
  const bases = [0, 1, HALF - 1, HALF, FRAME_COUNT - 1];
  const deltas = [-HALF, -HALF + 1, -1, 0, 1, HALF - 2, HALF - 1];
  for (const base of bases) {
    for (const delta of deltas) {
      const frame =
        (((base + delta) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
      assert.equal(
        subtractFrames(frame, base),
        delta,
        `base ${base}, delta ${delta}`
      );
    }
  }
});

// A sum like start + fade can pass FRAME_COUNT without being masked, and still
// compares correctly with a frame that has wrapped
test('an unmasked sum compares with a wrapped frame', () => {
  const end = FRAME_COUNT - 10 + 16;
  assert.equal(subtractFrames(end, 3), 3);
  assert.equal(subtractFrames(3, end), -3);
});
