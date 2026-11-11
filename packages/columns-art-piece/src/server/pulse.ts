import { FRAME_PERIOD, MIN_FADE_FRAMES, SCENE_LEAD_FRAMES } from 'rvl-node';

import { type Column, type Settings } from '../common/messages.ts';
import { getColumns } from './columns.ts';
import { getSettings, sendColumnScene, showColumns } from './show.ts';

// The longest rvl-node takes to land a change, since it holds one request
// behind one scene in flight. A pulse step sent sooner would be held as well
const CHANGE_LANDING_TIME =
  2 * (SCENE_LEAD_FRAMES + MIN_FADE_FRAMES) * FRAME_PERIOD;

type Pulse = { column: Column; settings: Settings };

let waitTimer: ReturnType<typeof setTimeout> | undefined;
let isPulsePlaying = false;
let hasChangeWaiting = false;

function convertTenthsToFrames(tenths: number): number {
  return Math.round((tenths * 100) / FRAME_PERIOD);
}

// From asking for a fade until it has run out
function calculateFadeEndTime(fadeFrames: number): number {
  return (SCENE_LEAD_FRAMES + fadeFrames) * FRAME_PERIOD;
}

function scheduleNextPulse(landingTime: number): void {
  const { pulseMinDelay, pulseDelaySpread } = getSettings();
  const delay = (pulseMinDelay + pulseDelaySpread * Math.random()) * 1000;
  waitTimer = setTimeout(startPulseOnRandomColumn, landingTime + delay);
}

function startPulseOnRandomColumn(): void {
  const columns = getColumns();
  if (columns.length === 0) {
    scheduleNextPulse(0);
    return;
  }
  // Kept for the decay, which has to undo exactly what the attack sent
  const pulse: Pulse = {
    column: columns[Math.floor(Math.random() * columns.length)],
    settings: getSettings(),
  };
  const fadeFrames = convertTenthsToFrames(pulse.settings.pulseAttack);
  isPulsePlaying = true;
  sendColumnScene(pulse.column, pulse.settings, true, fadeFrames);
  setTimeout(() => {
    startPulseDecay(pulse);
  }, calculateFadeEndTime(fadeFrames));
}

function startPulseDecay({ column, settings }: Pulse): void {
  const fadeFrames = convertTenthsToFrames(settings.pulseDecay);
  sendColumnScene(column, settings, false, fadeFrames);
  setTimeout(endPulse, calculateFadeEndTime(fadeFrames));
}

function endPulse(): void {
  isPulsePlaying = false;
  if (hasChangeWaiting) {
    hasChangeWaiting = false;
    showColumnsBetweenPulses();
  } else {
    scheduleNextPulse(0);
  }
}

export function startPulses(): void {
  scheduleNextPulse(0);
}

// For any change to the settings or the listed columns: at once, or when the
// playing pulse ends
export function showColumnsBetweenPulses(): void {
  if (isPulsePlaying) {
    hasChangeWaiting = true;
    return;
  }
  clearTimeout(waitTimer);
  showColumns();
  scheduleNextPulse(CHANGE_LANDING_TIME);
}
