"use strict";
/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Messaging.

Raver Lights Messaging is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Messaging is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Messaging.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const bridge_1 = require("./bridge");
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
exports.MAX_NUM_WAVES = 4; // Note: this MUST match the NUM_WAVES define in C++!
let created = false;
const emptyChannel = { a: 0, b: 0, w_x: 0, w_t: 0, phi: 0 };
const emptyWave = {
    h: { ...emptyChannel },
    s: { ...emptyChannel },
    v: { ...emptyChannel },
    a: { ...emptyChannel }
};
class RVL extends events_1.EventEmitter {
    constructor({ networkInterface, port = 4978, mode = 'receiver', logLevel = 'info' }) {
        super();
        this._isInitialized = false;
        if (created) {
            throw new Error(`Currently the RVL class can only be instantiated once per process.`);
        }
        created = true;
        const waves = [];
        for (let i = 0; i < exports.MAX_NUM_WAVES; i++) {
            waves.push({ ...emptyWave });
        }
        this._waveParameters = {
            waves,
            timePeriod: DEFAULT_TIME_PERIOD,
            distancePeriod: DEFAULT_DISTANCE_PERIOD
        };
        bridge_1.listenForWaveParameterUpdates((newParameters) => {
            this._waveParameters = newParameters;
            this.emit('waveParametersUpdated', this._waveParameters);
        });
        bridge_1.init(networkInterface, port, mode, logLevel, () => {
            bridge_1.setWaveParameters(this._waveParameters);
            this._isInitialized = true;
            this.emit('initialized');
        });
    }
    get waveParameters() {
        return this._waveParameters;
    }
    start() {
        if (!this._isInitialized) {
            throw new Error('Cannot call "start" until the platform has been initialized and the "initialized" event has been emitted');
        }
        bridge_1.start();
    }
    stop() {
        if (!this._isInitialized) {
            throw new Error('Cannot call "stop" until the platform has been initialized and the "initialized" event has been emitted');
        }
        bridge_1.stop();
    }
    setWaveParameters({ waves, timePeriod = DEFAULT_TIME_PERIOD, distancePeriod = DEFAULT_DISTANCE_PERIOD }) {
        if (!this._isInitialized) {
            throw new Error('Cannot call "setWaveParameters" until the platform has been initialized ' +
                'and the "initialized" event has been emitted');
        }
        if (waves.length > exports.MAX_NUM_WAVES) {
            throw new Error(`Only ${exports.MAX_NUM_WAVES} waves are supported at a time`);
        }
        waves = [...waves]; // Clone the array so we don't modify the user's array
        for (let i = waves.length; i < exports.MAX_NUM_WAVES; i++) {
            waves.push({ ...emptyWave });
        }
        this._waveParameters = { waves, timePeriod, distancePeriod };
        bridge_1.setWaveParameters(this._waveParameters);
        this.emit('waveParametersUpdated', this._waveParameters);
    }
    getAnimationTime() {
        return bridge_1.getAnimationTime();
    }
}
exports.RVL = RVL;
//# sourceMappingURL=index.js.map