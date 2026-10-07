import { parseArgs } from 'node:util';

import {
  createSimpleWaveParameters,
  FRAME_PERIOD,
  getEarliestStartFrame,
  getNetworkInterface,
  init,
  isConnected,
  on,
  setAnimationParameters,
  setOff,
  subtractFrames,
  toLocalTime,
  waitForClockSync,
} from '../src/index.ts';

const { values } = parseArgs({
  options: {
    channel: { type: 'string', short: 'c', default: '0' },
    interface: { type: 'string', short: 'i' },
  },
});
const channel = Number(values.channel);

// Four beats at 144 BPM
const BAR_DURATION = (4 * 60000) / 144;
const BAR_FRAMES = BAR_DURATION / FRAME_PERIOD;
const RATE = 8;
const HUE_SPREAD = 12;
const BRIGHTNESS = 255;
const OFF_FADE_FRAMES = 250;

type Step =
  | { type: 'wave'; name: string; hue: number; fadeBars: number }
  | { type: 'off' };

function wave(name: string, hue: number, fadeBars = 1): Step {
  return { type: 'wave', name, hue, fadeBars };
}

// Looped. A wave fades in over its bars, off over 250 frames
const steps: Step[] = [
  wave('red', 0),
  wave('red-orange', 16),
  wave('orange', 32),
  wave('red-orange', 16),
  wave('blue, a section change', 160, 4),
  wave('azure', 144),
  wave('violet', 176),
  wave('blue', 160),
  { type: 'off' },
];

// Set by the first look, so bar 0 is the earliest start that look read
let barZeroFrame: number | undefined;
let stepIndex = 0;
let lastBar = -1;
// The bar the last scene's fade ends on, where the next one belongs
let expectedBar = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

// In fleet frames, so every look at a bar gives the same frame. Snapped from
// local time at each look, the clock's millisecond corrections would flip a
// bar near a half frame between two frames
function getBarFrame(barZero: number, bar: number): number {
  return barZero + Math.round(bar * BAR_FRAMES);
}

function findFirstBarAtOrAfter(
  barZero: number,
  frame: number,
  fromBar: number
): number {
  let bar = fromBar;
  while (subtractFrames(getBarFrame(barZero, bar), frame) < 0) {
    bar++;
  }
  return bar;
}

// Runs once the last scene is promoted, and looks again a frame later while
// the channel can't take an explicit start yet
function scheduleNextScene(): void {
  const earliest = getEarliestStartFrame(channel);
  if (earliest === undefined) {
    timer = setTimeout(scheduleNextScene, FRAME_PERIOD);
    return;
  }
  const barZero = (barZeroFrame ??= earliest);
  const bar = findFirstBarAtOrAfter(barZero, earliest, lastBar + 1);
  if (bar > expectedBar) {
    console.log(`Skipped ${bar - expectedBar} bars`);
  }
  const start = getBarFrame(barZero, bar);
  const step = steps[stepIndex];
  stepIndex = (stepIndex + 1) % steps.length;

  if (step.type === 'off') {
    void setOff(channel, { startFrame: start, fadeFrames: OFF_FADE_FRAMES });
    expectedBar = findFirstBarAtOrAfter(
      barZero,
      start + OFF_FADE_FRAMES,
      bar + 1
    );
    console.log(
      `Bar ${bar}: off at frame ${start}, fading over ${OFF_FADE_FRAMES} frames`
    );
  } else {
    const fade = subtractFrames(
      getBarFrame(barZero, bar + step.fadeBars),
      start
    );
    const parameters = createSimpleWaveParameters({
      rate: RATE,
      waveHue: (step.hue + HUE_SPREAD) & 0xff,
      backgroundHue: (step.hue - HUE_SPREAD) & 0xff,
      brightness: BRIGHTNESS,
    });
    void setAnimationParameters(channel, parameters, {
      startFrame: start,
      fadeFrames: fade,
    });
    expectedBar = bar + step.fadeBars;
    console.log(
      `Bar ${bar}: ${step.name} at frame ${start}, fading over ${fade} frames`
    );
  }
  lastBar = bar;

  // The scene is promoted in its start frame, so look in the one after
  const nextLook = toLocalTime((start + 1) * FRAME_PERIOD);
  timer = setTimeout(
    scheduleNextScene,
    Math.max(0, nextLook - performance.now())
  );
}

await init({ networkInterface: values.interface });
console.log(`Sending on channel ${channel} over ${getNetworkInterface()}`);
on('connected', () => {
  console.log('Connected');
});
on('disconnected', () => {
  console.log('Disconnected');
});

// Clearing the timer first keeps an explicit start from landing on the held
// off, which waits out a pending scene and its fade
process.on('SIGINT', () => {
  clearTimeout(timer);
  console.log(`Turning off channel ${channel}`);
  void setOff(channel).then(() => process.exit());
});

// Without an ID every scene would be dropped
await new Promise<void>((resolve) => {
  if (isConnected()) {
    resolve();
  } else {
    on('connected', resolve);
  }
});
await waitForClockSync();
scheduleNextScene();
