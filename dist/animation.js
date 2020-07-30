"use strict";
/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

RVL Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RVL Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with RVL Node.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRainbowWave = exports.createPulsingWave = exports.createMovingWave = exports.createColorCycleWave = exports.createSolidColorWave = exports.createEmptyWave = exports.createWaveParameters = void 0;
const EMPTY_CHANNEL = { a: 0, w_t: 0, w_x: 0, phi: 0, b: 0 };
function validateNum(num, min, max, name) {
    if (typeof num !== 'number' || num < min || num > max) {
        throw new Error(`Invalid ${name} ${num}. ` +
            `${name[0].toUpperCase() + name.substring(1)} must be a number between ${min} and ${max}`);
    }
}
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
function createEmptyWave() {
    return {
        h: { ...EMPTY_CHANNEL },
        s: { ...EMPTY_CHANNEL },
        v: { ...EMPTY_CHANNEL },
        a: { ...EMPTY_CHANNEL }
    };
}
exports.createEmptyWave = createEmptyWave;
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