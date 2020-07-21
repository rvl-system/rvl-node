"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const EMPTY_CHANNEL = { a: 0, w_t: 0, w_x: 0, phi: 0, b: 0 };
let nWaves = 0;
let nPixels = 0;
let startTime = 0;
let time = 0;
let wParameters;
function initRenderer(waveParameters, numPixels, numWaves = 4) {
    nWaves = numWaves;
    nPixels = numPixels;
    wParameters = waveParameters;
    startTime = Date.now();
}
exports.initRenderer = initRenderer;
function resetRendererClock() {
    startTime = Date.now();
}
exports.resetRendererClock = resetRendererClock;
function getRendererClock() {
    return time;
}
exports.getRendererClock = getRendererClock;
// Modified from https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
function hsvToRgb(color) {
    const [h, s, v] = color;
    let r = 0;
    let g = 0;
    let b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }
    return [r * 255, g * 255, b * 255];
}
function calculatePixelValue(waveChannel, t, x) {
    // Approximate 8-bit sin function from C++
    let sin = 2 * Math.PI * (waveChannel.w_t * t / 100 + waveChannel.w_x * x + waveChannel.phi) / 255;
    sin = 127.5 * (Math.sin(sin) + 1);
    sin = Math.round(sin * waveChannel.a / 255 + waveChannel.b);
    return sin;
}
function renderPixels() {
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
    const colors = [];
    time = animationClock % 25500;
    for (let i = 0; i < nPixels; i++) {
        const pixelColorLayers = [];
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
        const pixel = {
            r: layer[nWaves - 1].r,
            g: layer[nWaves - 1].g,
            b: layer[nWaves - 1].b
        };
        function blend(bottom, top, alpha) {
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
exports.renderPixels = renderPixels;
function createEmptyWave() {
    return {
        h: { ...EMPTY_CHANNEL },
        s: { ...EMPTY_CHANNEL },
        v: { ...EMPTY_CHANNEL },
        a: { ...EMPTY_CHANNEL }
    };
}
exports.createEmptyWave = createEmptyWave;
function createWaveParameters(wave1, wave2, wave3, wave4) {
    return {
        waves: [
            wave1 || createEmptyWave(),
            wave2 || createEmptyWave(),
            wave3 || createEmptyWave(),
            wave4 || createEmptyWave()
        ]
    };
}
exports.createWaveParameters = createWaveParameters;
function validateNum(num, min, max, name) {
    if (typeof num !== 'number' || num < min || num > max) {
        throw new Error(`Invalid ${name} ${num}. ` +
            `${name[0].toUpperCase() + name.substring(1)} must be a number between ${min} and ${max}`);
    }
}
function createSolidColorWave(h, s, a) {
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
exports.createSolidColorWave = createSolidColorWave;
function createColorCycleWave(rate, a) {
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
exports.createColorCycleWave = createColorCycleWave;
function createMovingWave(h, s, rate, spacing) {
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
exports.createMovingWave = createMovingWave;
function createPulsingWave(h, s, rate) {
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
exports.createPulsingWave = createPulsingWave;
function createRainbowWave(a, rate) {
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
exports.createRainbowWave = createRainbowWave;
//# sourceMappingURL=animation.js.map