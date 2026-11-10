import {
  type AnimationColorParameters,
  type AnimationLayer,
  type AnimationParameters,
} from './types.ts';

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
  const layer = createEmptyAnimation();
  layer.h.b = Math.round(h);
  layer.s.b = Math.round(s);
  layer.v.b = 255;
  layer.a.b = Math.round(a);
  return layer;
}

export function createColorCycleAnimation(
  rate: number,
  a: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const layer = createEmptyAnimation();
  layer.h.a = 255;
  layer.h.w_t = Math.round(rate);
  layer.h.w_x = 0;
  layer.s.b = 255;
  layer.v.b = 255;
  layer.a.b = Math.round(a);
  return layer;
}

export function createMovingAnimation(
  h: number,
  s: number,
  rate: number,
  spacing: number
): AnimationLayer {
  validateNum(rate, 0, 32, 'rate');
  validateNum(spacing, 1, 16, 'spacing');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const layer = createEmptyAnimation();
  layer.h.b = Math.round(h);
  layer.s.b = Math.round(s);
  layer.v.b = 255;
  layer.a.a = 255;
  layer.a.w_t = Math.round(rate);
  layer.a.w_x = Math.round(spacing);
  return layer;
}

export function createPulsingAnimation(
  h: number,
  s: number,
  rate: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(h, 0, 255, 'hue');
  validateNum(s, 0, 255, 'saturation');
  const layer = createEmptyAnimation();
  layer.h.b = Math.round(h);
  layer.s.b = Math.round(s);
  layer.v.b = 255;
  layer.a.w_t = Math.round(rate);
  layer.a.a = 255;
  return layer;
}

export function createRainbowAnimation(
  a: number,
  rate: number
): AnimationLayer {
  validateNum(rate, 1, 32, 'rate');
  validateNum(a, 0, 255, 'alpha');
  const layer = createEmptyAnimation();

  layer.h.a = 255;
  layer.h.w_t = Math.round(rate);
  layer.h.w_x = 2;
  layer.s.b = 255;
  layer.v.b = 255;
  layer.a.b = Math.round(a);
  return layer;
}

// The Wave preset without its foreground layer: the wave over the background,
// so the strip's average color holds still while the pattern moves
export function createSimpleWaveParameters({
  rate,
  waveHue,
  backgroundHue,
  brightness,
}: {
  rate: number;
  waveHue: number;
  backgroundHue: number;
  brightness: number;
}): AnimationParameters {
  validateNum(rate, 0, 32, 'rate');
  validateNum(waveHue, 0, 255, 'wave hue');
  validateNum(backgroundHue, 0, 255, 'background hue');
  validateNum(brightness, 0, 255, 'brightness');
  const wave = createEmptyAnimation();
  wave.h.b = Math.round(waveHue);
  wave.s.b = 255;
  wave.v.b = Math.round(brightness);
  wave.a.a = 255;
  wave.a.w_t = Math.round(rate);
  wave.a.w_x = 2;
  const background = createEmptyAnimation();
  background.h.b = Math.round(backgroundHue);
  background.s.b = 255;
  background.v.b = Math.round(brightness);
  background.a.a = 255;
  return createAnimationParameters(wave, undefined, background);
}
