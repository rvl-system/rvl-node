/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

Raver Lights Node Animations is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node Animations is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node Animations.  If not, see <http://www.gnu.org/licenses/>.
*/

import { IWaveParameters, IWave, IWaveChannel } from './types';

const EMPTY_CHANNEL: IWaveChannel = { a: 0, w_t: 0, w_x: 0, phi: 0, b: 0 };

export interface IPixel {
  r: number;
  g: number;
  b: number;
}

interface IColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

let nWaves = 0;
let nPixels = 0;
let startTime = 0;
let time = 0;
let wParameters: IWaveParameters;

export function initRenderer(waveParameters: IWaveParameters, numPixels: number, numWaves = 4): void {
  nWaves = numWaves;
  nPixels = numPixels;
  wParameters = waveParameters;
  startTime = Date.now();
}

export function resetRendererClock(): void {
  startTime = Date.now();
}

export function getRendererClock(): number {
  return time;
}

// Modified from https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
function hsvToRgb(color: number[]): number[] {
  const [ h, s, v] = color;
  let r = 0;
  let g = 0;
  let b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r * 255, g * 255, b * 255 ];
}

function calculatePixelValue(waveChannel: IWaveChannel, t: number, x: number): number {
  // Approximate 8-bit sin function from C++
  let sin = 2 * Math.PI * (waveChannel.w_t * t / 100 + waveChannel.w_x * x + waveChannel.phi) / 255;
  sin = 127.5 * (Math.sin(sin) + 1);
  sin = Math.round(sin * waveChannel.a / 255 + waveChannel.b);
  return sin;
}

export function renderPixels(): IPixel[] {
  if (!calculatePixelValue) {
    throw new Error('renderPixels called before init');
  }
  const animationClock = Date.now() - startTime;
  if (!wParameters.timePeriod) {
    wParameters.timePeriod = 255;
  }
  if (!wParameters.distancePeriod) {
    wParameters.distancePeriod = 32;
  }
  const colors: IColor[][] = [];
  time = animationClock % 25500;
  for (let i = 0; i < nPixels; i++) {
    const pixelColorLayers: IColor[] = [];

    for (let j = 0; j < nWaves; j++) {
      const x = Math.floor(255 * (i % wParameters.distancePeriod) / wParameters.distancePeriod);
      const wave = wParameters.waves[j];
      const pixelColor = hsvToRgb([
        calculatePixelValue(wave.h, time, x) / 255,
        calculatePixelValue(wave.s, time, x) / 255,
        calculatePixelValue(wave.v, time, x) / 255
      ]);
      pixelColorLayers[j] = {
        r: pixelColor[0],
        g: pixelColor[1],
        b: pixelColor[2],
        a: calculatePixelValue(wave.a, time, x)
      };
    }
    colors[i] = pixelColorLayers;
  }
  return colors.map((layer) => {
    const pixel: IPixel = {
      r: layer[nWaves - 1].r,
      g: layer[nWaves - 1].g,
      b: layer[nWaves - 1].b
    };
    function blend(bottom: number, top: number, alpha: number): number {
      alpha = alpha / 255;
      bottom = bottom / 255;
      top = alpha * top / 255;
      return Math.round(255 * (top + bottom * (1 - alpha)));
    }
    for (let i = nWaves - 2; i >= 0; i--) {
      pixel.r = blend(pixel.r, layer[i].r, layer[i].a);
      pixel.g = blend(pixel.g, layer[i].g, layer[i].a);
      pixel.b = blend(pixel.b, layer[i].b, layer[i].a);
    }
    return pixel;
  });
}

export function createEmptyWave(): IWave {
  return {
    h: { ...EMPTY_CHANNEL },
    s: { ...EMPTY_CHANNEL },
    v: { ...EMPTY_CHANNEL },
    a: { ...EMPTY_CHANNEL }
  };
}

export function createWaveParameters(wave1?: IWave, wave2?: IWave, wave3?: IWave, wave4?: IWave): IWaveParameters {
  return {
    waves: [
      wave1 || createEmptyWave(),
      wave2 || createEmptyWave(),
      wave3 || createEmptyWave(),
      wave4 || createEmptyWave()
    ]
  };
}

function validateNum(num: number, min: number, max: number, name: string): void {
  if (typeof num !== 'number' || num < min || num > max) {
    throw new Error(`Invalid ${name} ${num}. ` +
      `${name[0].toUpperCase() + name.substring(1)} must be a number between ${min} and ${max}`);
  }
}

export function createSolidColorWave(h: number, s: number, a: number): IWave {
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

export function createColorCycleWave(rate: number, a: number): IWave {
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

export function createMovingWave(h: number, s: number, rate: number, spacing: number): IWave {
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

export function createPulsingWave(h: number, s: number, rate: number): IWave {
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

export function createRainbowWave(a: number, rate: number): IWave {
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
