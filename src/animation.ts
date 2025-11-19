import { type Wave, type WaveChannel, type WaveParameters } from './types.js';

const EMPTY_CHANNEL: WaveChannel = { a: 0, w_t: 0, w_x: 0, phi: 0, b: 0 };

function validateNum(
  num: number,
  min: number,
  max: number,
  name: string
): void {
  if (typeof num !== 'number' || num < min || num > max) {
    throw new Error(
      `Invalid ${name} ${num}. ` +
        `${name[0].toUpperCase() + name.substring(1)} must be a number between ${min} and ${max}`
    );
  }
}

export function createWaveParameters(
  wave1?: Wave,
  wave2?: Wave,
  wave3?: Wave,
  wave4?: Wave
): WaveParameters {
  return {
    waves: [
      wave1 || createEmptyWave(),
      wave2 || createEmptyWave(),
      wave3 || createEmptyWave(),
      wave4 || createEmptyWave(),
    ],
  };
}

export function createEmptyWave(): Wave {
  return {
    h: { ...EMPTY_CHANNEL },
    s: { ...EMPTY_CHANNEL },
    v: { ...EMPTY_CHANNEL },
    a: { ...EMPTY_CHANNEL },
  };
}

export function createSolidColorWave(h: number, s: number, a: number): Wave {
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyWave();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}

export function createColorCycleWave(rate: number, a: number): Wave {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyWave();
  wave.h.a = 255;
  wave.h.w_t = Math.round(rate);
  wave.h.w_x = 0;
  wave.s.b = 255;
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}

export function createMovingWave(
  h: number,
  s: number,
  rate: number,
  spacing: number
): Wave {
  validateNum(rate, 0, 32, 'rate');
  validateNum(spacing, 1, 16, 'spacing');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const wave = createEmptyWave();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.a = 255;
  wave.a.w_t = Math.round(rate);
  wave.a.w_x = Math.round(spacing);
  return wave;
}

export function createPulsingWave(h: number, s: number, rate: number): Wave {
  validateNum(rate, 1, 32, 'rate');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const wave = createEmptyWave();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.w_t = Math.round(rate);
  wave.a.a = 255;
  return wave;
}

export function createRainbowWave(a: number, rate: number): Wave {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyWave();

  wave.h.a = 255;
  wave.h.w_t = Math.round(rate);
  wave.h.w_x = 2;
  wave.s.b = 255;
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}
