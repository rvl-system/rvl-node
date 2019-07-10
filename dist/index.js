"use strict";
/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Node.

Raver Lights Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node.  If not, see <http://www.gnu.org/licenses/>.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const bridge_1 = require("./bridge");
let created = false;
class RVL extends events_1.EventEmitter {
    constructor({ networkInterface, port = 4978, mode = 'receiver', logLevel = 'info', channel, enableClockSync = false }) {
        super();
        this._isInitialized = false;
        if (created) {
            throw new Error(`Currently the RVL class can only be instantiated once per process.`);
        }
        created = true;
        this._mode = mode;
        this._waveParameters = bridge_1.createEmptyWaveParameters();
        bridge_1.listenForWaveParameterUpdates((newParameters) => {
            this._waveParameters = newParameters;
            this.emit('waveParametersUpdated', this._waveParameters);
        });
        bridge_1.init(networkInterface, port, mode, channel, logLevel, enableClockSync, () => {
            bridge_1.setWaveParameters(this._waveParameters);
            this._isInitialized = true;
            this.emit('initialized');
        });
    }
    get waveParameters() {
        return this._waveParameters;
    }
    get mode() {
        return this._mode;
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
    setWaveParameters({ waves, timePeriod = bridge_1.DEFAULT_TIME_PERIOD, distancePeriod = bridge_1.DEFAULT_DISTANCE_PERIOD }) {
        if (!this._isInitialized) {
            throw new Error('Cannot call "setWaveParameters" until the platform has been initialized ' +
                'and the "initialized" event has been emitted');
        }
        if (this._mode !== 'controller') {
            throw new Error(`Cannot set wave parameters while in ${this._mode} mode`);
        }
        if (waves.length > bridge_1.MAX_NUM_WAVES) {
            throw new Error(`Only ${bridge_1.MAX_NUM_WAVES} waves are supported at a time`);
        }
        waves = [...waves]; // Clone the array so we don't modify the user's array
        for (let i = waves.length; i < bridge_1.MAX_NUM_WAVES; i++) {
            waves.push({ ...bridge_1.createEmptyWave() });
        }
        this._waveParameters = { waves, timePeriod, distancePeriod };
        bridge_1.setWaveParameters(this._waveParameters);
    }
    getAnimationTime() {
        return bridge_1.getAnimationTime();
    }
}
exports.RVL = RVL;
//# sourceMappingURL=index.js.map