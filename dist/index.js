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
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b, _c;
"use strict";
__export(require("./animation"));
const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = 'debug';
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
const isInitialized = Symbol();
const waveParameters = Symbol();
const brightness = Symbol();
const powerState = Symbol();
class RVLController {
    constructor({ networkInterface, channel, port = DEFAULT_PORT, logLevel = DEFAULT_LOG_LEVEL }) {
        this[_a] = false;
        this[_b] = 0;
        this[_c] = false;
        // TODO
    }
    get waveParameters() {
        return this[waveParameters];
    }
    get animationTime() {
        // TODO
        return 0;
    }
    get powerState() {
        return this[powerState];
    }
    get brightness() {
        return this[brightness];
    }
    async init() {
        // TODO
        this[isInitialized] = true;
    }
    async close() {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "close" before calling "init"');
        }
        // TODO
    }
    setWaveParameters(newWaveParameters) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setWaveParameters" before calling "init"');
        }
        if (newWaveParameters.waves.length > MAX_NUM_WAVES) {
            throw new Error(`Only ${MAX_NUM_WAVES} waves max are supported`);
        }
        if (typeof newWaveParameters.timePeriod !== 'number') {
            newWaveParameters.timePeriod = DEFAULT_TIME_PERIOD;
        }
        if (typeof newWaveParameters.distancePeriod !== 'number') {
            newWaveParameters.timePeriod = DEFAULT_DISTANCE_PERIOD;
        }
        // TODO
        this[waveParameters] = newWaveParameters;
    }
    setPowerState(newPowerState) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setPowerState" before calling "init"');
        }
        // TODO
        this[powerState] = newPowerState;
    }
    setBrightness(newBrightness) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setBrightness" before calling "init"');
        }
        // TODO
        this[brightness] = newBrightness;
    }
}
_a = isInitialized, _b = brightness, _c = powerState;
exports.RVLController = RVLController;
//# sourceMappingURL=index.js.map