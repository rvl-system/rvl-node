import { expect, test } from 'vitest';

import {
  createAnimationParameters,
  createColorCycleAnimation,
  createEmptyAnimation,
  createMovingAnimation,
  createPulsingAnimation,
  createRainbowAnimation,
  createSimpleWaveParameters,
  createSolidColorAnimation,
} from '../src/parametric.ts';
import {
  type AnimationColorParameters,
  type AnimationLayer,
} from '../src/types.ts';

// An empty layer with the named fields set, as 'h.b': 10
function layer(fields: Record<string, number>): AnimationLayer {
  const result = createEmptyAnimation();
  for (const [path, value] of Object.entries(fields)) {
    const [component, field] = path.split('.') as [
      keyof AnimationLayer,
      keyof AnimationColorParameters,
    ];
    result[component][field] = value;
  }
  return result;
}

test('an empty layer is all zeros', () => {
  const empty = createEmptyAnimation();
  for (const component of [empty.h, empty.s, empty.v, empty.a]) {
    expect(component).toEqual({ a: 0, b: 0, w_t: 0, w_x: 0, phi: 0 });
  }
});

test('parameters hold four layers, empty where none is given', () => {
  const solid = createSolidColorAnimation(10, 20, 30);
  const parameters = createAnimationParameters(solid);
  expect(parameters.animations).toEqual([
    solid,
    createEmptyAnimation(),
    createEmptyAnimation(),
    createEmptyAnimation(),
  ]);
  expect(parameters.timePeriod).toBeUndefined();
  expect(parameters.distancePeriod).toBeUndefined();
});

test('a solid color', () => {
  expect(createSolidColorAnimation(10, 20, 30)).toEqual(
    layer({ 'h.b': 10, 's.b': 20, 'v.b': 255, 'a.b': 30 })
  );
  expect(createSolidColorAnimation(10.6, 20, 30).h.b).toBe(11);
  expect(() => createSolidColorAnimation(256, 20, 30)).toThrow(/hue/);
  expect(() => createSolidColorAnimation(10, -1, 30)).toThrow(/saturation/);
  expect(() => createSolidColorAnimation(10, 20, 256)).toThrow(/alpha/);
});

test('a color cycle', () => {
  expect(createColorCycleAnimation(8, 100)).toEqual(
    layer({ 'h.a': 255, 'h.w_t': 8, 's.b': 255, 'v.b': 255, 'a.b': 100 })
  );
  expect(() => createColorCycleAnimation(0, 100)).toThrow(/rate/);
  expect(() => createColorCycleAnimation(33, 100)).toThrow(/rate/);
});

test('a moving animation', () => {
  expect(createMovingAnimation(10, 20, 8, 4)).toEqual(
    layer({
      'h.b': 10,
      's.b': 20,
      'v.b': 255,
      'a.a': 255,
      'a.w_t': 8,
      'a.w_x': 4,
    })
  );
  expect(() => createMovingAnimation(10, 20, 33, 4)).toThrow(/rate/);
  expect(() => createMovingAnimation(10, 20, 8, 0)).toThrow(/spacing/);
});

test('a pulsing animation', () => {
  expect(createPulsingAnimation(10, 20, 8)).toEqual(
    layer({ 'h.b': 10, 's.b': 20, 'v.b': 255, 'a.a': 255, 'a.w_t': 8 })
  );
  expect(() => createPulsingAnimation(10, 20, 0)).toThrow(/rate/);
});

test('a rainbow', () => {
  expect(createRainbowAnimation(100, 4)).toEqual(
    layer({
      'h.a': 255,
      'h.w_t': 4,
      'h.w_x': 2,
      's.b': 255,
      'v.b': 255,
      'a.b': 100,
    })
  );
  expect(() => createRainbowAnimation(100, 0)).toThrow(/rate/);
});

// The Wave preset's wave and background layers, slots 0 and 2, with the
// foreground slot between them empty
test('a simple wave is the wave preset without its foreground', () => {
  const parameters = createSimpleWaveParameters({
    rate: 8,
    waveHue: 10,
    backgroundHue: 20,
    brightness: 200,
  });
  expect(parameters.animations).toEqual([
    layer({
      'h.b': 10,
      's.b': 255,
      'v.b': 200,
      'a.a': 255,
      'a.w_t': 8,
      'a.w_x': 2,
    }),
    createEmptyAnimation(),
    layer({ 'h.b': 20, 's.b': 255, 'v.b': 200, 'a.a': 255 }),
    createEmptyAnimation(),
  ]);
  expect(parameters.timePeriod).toBeUndefined();
  expect(parameters.distancePeriod).toBeUndefined();
  const good = { rate: 8, waveHue: 10, backgroundHue: 20, brightness: 200 };
  expect(() => createSimpleWaveParameters({ ...good, rate: 33 })).toThrow(
    /rate/
  );
  expect(() => createSimpleWaveParameters({ ...good, waveHue: 256 })).toThrow(
    /wave hue/
  );
  expect(() =>
    createSimpleWaveParameters({ ...good, backgroundHue: -1 })
  ).toThrow(/background hue/);
  expect(() =>
    createSimpleWaveParameters({ ...good, brightness: 256 })
  ).toThrow(/brightness/);
});
