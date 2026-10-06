import { EventEmitter } from 'node:events';
import { debuglog } from 'node:util';
import { FRAME_PERIOD, NUM_OBSERVATIONS_IN_SET } from "./config.js";
const debug = debuglog('rvl-node');
// The signed distance between two frame numbers, valid across the 2^27 wrap:
// the firmware's subtractFrames
export function subtractFrames(a, b) {
    return (((a - b) * FRAME_PERIOD) | 0) / FRAME_PERIOD;
}
// Modular 32-bit arithmetic, like the clocks the firmware keeps
function wrap32(value) {
    return value >>> 0;
}
function signed32(value) {
    return value | 0;
}
// The firmware's ProtocolClockSync without voting: this node observes the
// coordinator's references and the boards' observations of them, and moves its
// offset toward the boards' consensus. It sends no observation, so it is in no
// board's median and leaves itself out of its own
let offset = 0;
let synchronized = false;
let rows = [];
const events = new EventEmitter();
function convertToAnimationClock(localTime) {
    return wrap32(Math.floor(localTime) + offset);
}
// Rows are keyed by id % NUM_OBSERVATIONS_IN_SET, as the boards key theirs,
// and another id takes a row over, so a coordinator that restarts its ids is
// followed at once
function getObservationRow(id) {
    const index = id % NUM_OBSERVATIONS_IN_SET;
    const row = rows[index];
    if (row?.id === id) {
        return row;
    }
    const fresh = { id, own: undefined, boards: new Map() };
    rows[index] = fresh;
    return fresh;
}
function adjustOffset(correction) {
    offset = wrap32(offset + correction);
    if (!synchronized) {
        synchronized = true;
        events.emit('synchronized');
    }
}
function processObservations() {
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
    debug('Updating animation clock with offset: %d from %d boards across %d references', correction, boardsObserved, rowsProcessed);
    adjustOffset(correction);
}
// A start of set processes the set before it first, so the observed time is on
// the corrected clock
export function handleReference(id, startOfSet, arrivalTime) {
    if (startOfSet) {
        processObservations();
    }
    getObservationRow(id).own = convertToAnimationClock(arrivalTime);
}
export function handleObservation(id, source, observedTime) {
    getObservationRow(id).boards.set(source, observedTime);
}
// Back to a clock that has never synced
export function _testOnlyResetClockSync() {
    offset = 0;
    synchronized = false;
    rows = [];
    events.removeAllListeners();
}
function assertClockSynchronized() {
    if (!synchronized) {
        throw new Error('The fleet clock has not synchronized yet. Wait for waitForClockSync()');
    }
}
// Resolves once the fleet clock has synced, at once if it already has
export function waitForClockSync() {
    if (synchronized) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        events.once('synchronized', resolve);
    });
}
export function getAnimationClock() {
    assertClockSynchronized();
    return convertToAnimationClock(performance.now());
}
export function toAnimationClock(localTime) {
    assertClockSynchronized();
    return convertToAnimationClock(localTime);
}
// The local time nearest now that maps to the clock value
export function toLocalTime(animationClock) {
    assertClockSynchronized();
    const now = performance.now();
    return now + signed32(animationClock - convertToAnimationClock(now));
}
//# sourceMappingURL=clock.js.map