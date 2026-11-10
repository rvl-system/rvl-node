import { EventEmitter } from 'node:events';
import { debuglog } from 'node:util';

import { FRAME_PERIOD, NUM_OBSERVATIONS_IN_SET } from './config.ts';

const debug = debuglog('rvl-node');

// The signed distance between two frame numbers, valid across the 2^27 wrap:
// the firmware's subtractFrames
export function subtractFrames(a: number, b: number): number {
  return (((a - b) * FRAME_PERIOD) | 0) / FRAME_PERIOD;
}

// Modular 32-bit arithmetic, like the clocks the firmware keeps
function wrap32(value: number): number {
  return value >>> 0;
}

function signed32(value: number): number {
  return value | 0;
}

// One reference broadcast's observations: this node's and the boards' by ID
type ObservationRow = {
  id: number;
  own: number | undefined;
  boards: Map<number, number>;
};

type ClockEvents = {
  synchronized: [];
  step: [shift: number, frame: number];
};

// The firmware's ProtocolClockSync without voting: this node observes the
// coordinator's references and the boards' observations of them, and moves its
// offset toward the boards' consensus. It sends no observation, so it is in no
// board's median and leaves itself out of its own
let offset = 0;
let synchronized = false;
const rows: (ObservationRow | undefined)[] = [];
const events = new EventEmitter<ClockEvents>();

function convertToAnimationClock(localTime: number): number {
  return wrap32(Math.floor(localTime) + offset);
}

function convertToAnimationFrame(localTime: number): number {
  return Math.floor(convertToAnimationClock(localTime) / FRAME_PERIOD);
}

// Rows are keyed by id % NUM_OBSERVATIONS_IN_SET, as the boards key theirs,
// and another reference takes a row over, so a coordinator that restarts its
// ids is followed at once
function claimObservationRow(id: number): ObservationRow {
  const index = id % NUM_OBSERVATIONS_IN_SET;
  const row = rows[index];
  if (row?.id === id) {
    return row;
  }
  const fresh = { id, own: undefined, boards: new Map<number, number>() };
  rows[index] = fresh;
  return fresh;
}

// A row still holding this node's observation of another reference was never
// processed, so the reference that starts this set was lost
function holdsUnprocessedReference(id: number): boolean {
  const row = rows[id % NUM_OBSERVATIONS_IN_SET];
  return row !== undefined && row.id !== id && row.own !== undefined;
}

// A step of a frame or more re-bases the scenes, as adjustAnimationClock does
// on a board. Both frames come from one local read, so the shift is exact
function adjustOffset(correction: number): void {
  const localTime = performance.now();
  const before = convertToAnimationFrame(localTime);
  offset = wrap32(offset + correction);
  if (!synchronized) {
    synchronized = true;
    events.emit('synchronized');
  } else if (Math.abs(correction) >= FRAME_PERIOD) {
    const after = convertToAnimationFrame(localTime);
    events.emit('step', subtractFrames(after, before), after);
  }
}

function processObservations(): void {
  let sum = 0;
  let rowsProcessed = 0;
  let boardsObserved = 0;
  // A row no board observed says nothing about the fleet, unless no row in the
  // set has a board's observation: then rvl-node is alone and syncs to itself
  const isFleetObserved = rows.some((row) => row && row.boards.size > 0);
  for (const row of rows) {
    if (!row) {
      continue;
    }
    const { own } = row;
    // A reference this node missed leaves nothing to compare against
    if (own === undefined || (isFleetObserved && row.boards.size === 0)) {
      row.own = undefined;
      row.boards.clear();
      continue;
    }
    // Deltas from this node's time rather than raw times, so a set that
    // straddles the 2^32 wrap still sorts
    const deltas = [...row.boards.values()]
      .map((time) => signed32(time - own))
      .sort((a, b) => a - b);
    // The upper median, or no correction for a lone rvl-node
    if (deltas.length > 0) {
      sum += deltas[Math.floor(deltas.length / 2)];
    }
    boardsObserved = Math.max(boardsObserved, deltas.length);
    rowsProcessed++;
    row.own = undefined;
    row.boards.clear();
  }
  if (rowsProcessed === 0) {
    return;
  }
  const correction = Math.trunc(sum / rowsProcessed);
  debug(
    'Updating animation clock with offset: %d from %d boards across %d references',
    correction,
    boardsObserved,
    rowsProcessed
  );
  adjustOffset(correction);
}

// A start of set processes the set before it first, so the observed time is on
// the corrected clock. A lost start of set is processed a reference late
export function handleReference(
  id: number,
  startOfSet: boolean,
  arrivalTime: number
): void {
  if (startOfSet || holdsUnprocessedReference(id)) {
    processObservations();
  }
  claimObservationRow(id).own = convertToAnimationClock(arrivalTime);
}

// An observation of a reference this node missed has nothing to be compared
// with, and one straggling from the last set must not take the row from its
// successor
export function handleObservation(
  id: number,
  source: number,
  observedTime: number
): void {
  const row = rows[id % NUM_OBSERVATIONS_IN_SET];
  if (row?.id === id) {
    row.boards.set(source, observedTime);
  }
}

function assertClockSynchronized(): void {
  if (!synchronized) {
    throw new Error(
      'The fleet clock has not synchronized yet. Wait for the connected event'
    );
  }
}

export function isClockSynchronized(): boolean {
  return synchronized;
}

export function subscribeToClockSteps(
  listener: (shift: number, frame: number) => void
): void {
  events.on('step', listener);
}

// Resolves once the fleet clock has synced, at once if it already has
export function waitForClockSync(): Promise<void> {
  if (synchronized) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    events.once('synchronized', resolve);
  });
}

export function getAnimationClock(): number {
  assertClockSynchronized();
  return convertToAnimationClock(performance.now());
}

export function getAnimationFrame(): number {
  assertClockSynchronized();
  return convertToAnimationFrame(performance.now());
}

export function toAnimationClock(localTime: number): number {
  assertClockSynchronized();
  return convertToAnimationClock(localTime);
}

// The local time nearest now that maps to the clock value
export function toLocalTime(animationClock: number): number {
  assertClockSynchronized();
  const now = performance.now();
  return now + signed32(animationClock - convertToAnimationClock(now));
}
