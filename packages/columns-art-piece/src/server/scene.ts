import {
  type AnimationLayer,
  type AnimationParameters,
  createEmptyAnimation,
} from 'rvl-node';

import { type Settings } from '../common/messages.ts';
import { convertToFirmwareColor } from './color.ts';

type Sweep = AnimationLayer['h'];

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
function buildPulseLayer(settings: Settings): AnimationLayer {
  const color = convertToFirmwareColor(settings.pulseColor);
  const layer = createEmptyAnimation();
  layer.h.b = color.h;
  layer.s.b = color.s;
  layer.v.b = color.v;
  layer.a.b = settings.pulseIntensity;
  return layer;
}

// Shift, with the two colors trading places, under the pulse's color when
// asked. At a coverage of 100 a column shows the half cycle from one color to
// the other, end to end. Every field is an integer in the encoder's range
export function buildColumnScene(
  settings: Settings,
  pixelCount: number,
  withPulse: boolean
): AnimationParameters {
  const near = convertToFirmwareColor(settings.firstColor);
  const far = convertToFirmwareColor(settings.secondColor);
  // In phase steps: what a column covers, and how far that runs past each
  // color
  const span = Math.round((HALF_CYCLE * settings.coverage) / 100);
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
  fading.a.w_t = settings.rate;

  return {
    distancePeriod: calculateDistancePeriod(pixelCount, span),
    // The top slot is the pulse's, and the encoder pads the bottom one
    animations: [
      withPulse ? buildPulseLayer(settings) : createEmptyAnimation(),
      fading,
      opaque,
    ],
  };
}
