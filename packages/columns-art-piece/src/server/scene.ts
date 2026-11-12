import {
  type AnimationLayer,
  type AnimationParameters,
  createColorCycleAnimation,
  createEmptyAnimation,
} from 'rvl-node';

import { type Animation, type Settings } from '../common/messages.ts';
import { convertToFirmwareColor } from './color.ts';

type Sweep = AnimationLayer['h'];
// The layers under the pulse's, top first
type BaseSceneBuilder = (
  settings: Settings,
  pixelCount: number
) => AnimationParameters;

const FULL_CYCLE = 256;
const HALF_CYCLE = 128;
const QUARTER_CYCLE = 64;
const MAX_DISTANCE_PERIOD = 255;

// From start to start + change, each that many phase steps inside its end
// of the column, or past it when the bleed is negative
function buildSweep(start: number, change: number, bleed: number): Sweep {
  return {
    a: Math.abs(change),
    // The lower end, wrapped for a hue arc that crosses 0
    b: (start + Math.min(change, 0) + 256) % 256,
    w_t: 0,
    w_x: 1,
    phi: (change < 0 ? QUARTER_CYCLE : -QUARTER_CYCLE) - bleed,
  };
}

// Half a cycle on, which trades the two ends
function reverseSweep(sweep: Sweep): Sweep {
  const shift = sweep.phi < 0 ? HALF_CYCLE : -HALF_CYCLE;
  return { ...sweep, phi: sweep.phi + shift };
}

// Signed, the shorter way round the hue circle
function calculateShortHueChange(from: number, to: number): number {
  return ((to - from + 384) % 256) - 128;
}

// Puts the first and last pixels a span apart
function calculateDistancePeriod(pixelCount: number, span: number): number {
  const period = Math.round(((pixelCount - 1) * FULL_CYCLE) / span);
  return Math.min(Math.max(period, 1), MAX_DISTANCE_PERIOD);
}

// One color over the whole column. It goes in each b, since a layer that
// doesn't move shows only half of an a
function buildSolidLayer(hex: string): AnimationLayer {
  const color = convertToFirmwareColor(hex);
  const layer = createEmptyAnimation();
  layer.h.b = color.h;
  layer.s.b = color.s;
  layer.v.b = color.v;
  return layer;
}

function buildPulseLayer(settings: Settings): AnimationLayer {
  const layer = buildSolidLayer(settings.pulseColor);
  layer.a.b = settings.pulseIntensity;
  return layer;
}

// The two colors trading places. At a coverage of 100 a column shows the
// half cycle from one color to the other, end to end
function buildShiftScene(
  settings: Settings,
  pixelCount: number
): AnimationParameters {
  const near = convertToFirmwareColor(settings.shiftFirstColor);
  const far = convertToFirmwareColor(settings.shiftSecondColor);
  // In phase steps: what a column covers, and how far that runs past each
  // color
  const span = Math.round((HALF_CYCLE * settings.shiftCoverage) / 100);
  const bleed = Math.round((span - HALF_CYCLE) / 2);

  const opaque = createEmptyAnimation();
  opaque.h = buildSweep(near.h, calculateShortHueChange(near.h, far.h), bleed);
  opaque.s = buildSweep(near.s, far.s - near.s, bleed);
  opaque.v = buildSweep(near.v, far.v - near.v, bleed);
  opaque.a.b = 255;

  const fading = createEmptyAnimation();
  fading.h = reverseSweep(opaque.h);
  fading.s = reverseSweep(opaque.s);
  fading.v = reverseSweep(opaque.v);
  fading.a.a = 255;
  fading.a.w_t = settings.shiftRate;

  return {
    distancePeriod: calculateDistancePeriod(pixelCount, span),
    animations: [fading, opaque],
  };
}

// A board's Wave: crests of one color travel over the background while the
// foreground swells over the whole column. A column is one period, so it
// holds the crests asked for
function buildWaveScene(
  settings: Settings,
  pixelCount: number
): AnimationParameters {
  const wave = buildSolidLayer(settings.waveColor);
  wave.a.a = 255;
  wave.a.w_t = settings.waveRate;
  wave.a.w_x = settings.waveCrests;
  const foreground = buildSolidLayer(settings.waveForegroundColor);
  foreground.a.a = 255;
  foreground.a.w_t = settings.waveRate;
  // In the bottom slot, which the firmware draws opaque
  const background = buildSolidLayer(settings.waveBackgroundColor);
  return {
    distancePeriod: Math.min(pixelCount, MAX_DISTANCE_PERIOD),
    animations: [wave, foreground, background],
  };
}

function buildColorCycleScene(settings: Settings): AnimationParameters {
  return {
    animations: [createColorCycleAnimation(settings.colorCycleRate, 255)],
  };
}

const BASE_SCENE_BUILDERS: Record<Animation, BaseSceneBuilder> = {
  shift: buildShiftScene,
  wave: buildWaveScene,
  colorCycle: buildColorCycleScene,
};

// The chosen animation, under the pulse's color when asked. Every field is
// an integer in the encoder's range
export function buildColumnScene(
  settings: Settings,
  pixelCount: number,
  withPulse: boolean
): AnimationParameters {
  const base = BASE_SCENE_BUILDERS[settings.animation](settings, pixelCount);
  return {
    ...base,
    // The top slot is the pulse's, and the encoder pads any left at the
    // bottom
    animations: [
      withPulse ? buildPulseLayer(settings) : createEmptyAnimation(),
      ...base.animations,
    ],
  };
}
