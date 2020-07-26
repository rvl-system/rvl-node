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
var _a;
"use strict";
const path_1 = require("path");
const worker_threads_1 = require("worker_threads");
__export(require("./animation"));
const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = 'debug';
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
const channelsInUse = new Set();
const isInitialized = Symbol();
const options = Symbol();
const rvlWorker = Symbol();
class RVLController {
    constructor({ networkInterface, channel, port = DEFAULT_PORT, logLevel = DEFAULT_LOG_LEVEL }) {
        this[_a] = false;
        if (channelsInUse.has(channel)) {
            throw new Error(`Channel ${channel} is already in use`);
        }
        channelsInUse.add(channel);
        this[options] = { networkInterface, channel, port, logLevel };
    }
    init() {
        return new Promise((resolve, reject) => {
            this[rvlWorker] = new worker_threads_1.Worker(path_1.join(__dirname, 'worker.js'), {
                workerData: this[options]
            });
            this[rvlWorker].on('error', reject);
            this[rvlWorker].on('exit', (code) => {
                throw new Error(`Internal Error: worker thread unexpectedly quit with code ${code}`);
            });
            this[rvlWorker].on('message', (message) => {
                console.log(message);
                if (!this[isInitialized]) {
                    if (message.type === 'initComplete') {
                        this[isInitialized] = true;
                        resolve();
                    }
                    else {
                        throw new Error(`Internal Error: received worker thread "${message.type}" message before receiving "initComplete" message`);
                    }
                }
                else {
                    switch (message.type) {
                        default:
                            throw new Error(`Internal Error: received unknown worker thread "${message.type}" message`);
                    }
                }
            });
        });
    }
    async close() {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "close" before calling "init"');
        }
        // TODO
        this[isInitialized] = false;
        channelsInUse.delete(this[options].channel);
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
        const message = {
            type: 'setWaveParameters',
            waveParameters: newWaveParameters
        };
        this[rvlWorker].postMessage(message);
    }
    setPowerState(newPowerState) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setPowerState" before calling "init"');
        }
        const message = {
            type: 'setPowerState',
            powerState: newPowerState
        };
        this[rvlWorker].postMessage(message);
    }
    setBrightness(newBrightness) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setBrightness" before calling "init"');
        }
        const message = {
            type: 'setBrightness',
            brightness: newBrightness
        };
        this[rvlWorker].postMessage(message);
    }
}
_a = isInitialized;
exports.RVLController = RVLController;
//# sourceMappingURL=index.js.map