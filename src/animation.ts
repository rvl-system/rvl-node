import {
  type AnimationColorParameters,
  type AnimationLayer,
  type AnimationParameters,
} from './types.js';

const EMPTY_CHANNEL: AnimationColorParameters = {
  a: 0,
  w_t: 0,
  w_x: 0,
  phi: 0,
  b: 0,
};

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

export function createAnimationParameters(
  animation1?: AnimationLayer,
  animation2?: AnimationLayer,
  animation3?: AnimationLayer,
  animation4?: AnimationLayer
): AnimationParameters {
  return {
    animations: [
      animation1 || createEmptyAnimation(),
      animation2 || createEmptyAnimation(),
      animation3 || createEmptyAnimation(),
      animation4 || createEmptyAnimation(),
    ],
  };
}

export function createEmptyAnimation(): AnimationLayer {
  return {
    h: { ...EMPTY_CHANNEL },
    s: { ...EMPTY_CHANNEL },
    v: { ...EMPTY_CHANNEL },
    a: { ...EMPTY_CHANNEL },
  };
}

export function createSolidColorAnimation(
  h: number,
  s: number,
  a: number
): AnimationLayer {
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyAnimation();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}

export function createColorCycleAnimation(
  rate: number,
  a: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyAnimation();
  wave.h.a = 255;
  wave.h.w_t = Math.round(rate);
  wave.h.w_x = 0;
  wave.s.b = 255;
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}

export function createWaveAnimation(
  h: number,
  s: number,
  rate: number,
  spacing: number
): AnimationLayer {
  validateNum(rate, 0, 32, 'rate');
  validateNum(spacing, 1, 16, 'spacing');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const wave = createEmptyAnimation();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.a = 255;
  wave.a.w_t = Math.round(rate);
  wave.a.w_x = Math.round(spacing);
  return wave;
}

export function createPulsingAnimation(
  h: number,
  s: number,
  rate: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const wave = createEmptyAnimation();
  wave.h.b = Math.round(h);
  wave.s.b = Math.round(s);
  wave.v.b = 255;
  wave.a.w_t = Math.round(rate);
  wave.a.a = 255;
  return wave;
}

export function createRainbowAnimation(
  a: number,
  rate: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const wave = createEmptyAnimation();

  wave.h.a = 255;
  wave.h.w_t = Math.round(rate);
  wave.h.w_x = 2;
  wave.s.b = 255;
  wave.v.b = 255;
  wave.a.b = Math.round(a);
  return wave;
}
