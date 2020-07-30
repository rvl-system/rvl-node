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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVLController = exports.processPacket = exports.initController = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
// Private and friend class properties
exports.initController = Symbol();
exports.processPacket = Symbol();
const isInitialized = Symbol();
const options = Symbol();
const rvlWorker = Symbol();
const sendPacket = Symbol();
class RVLController {
    constructor(channel, logLevel, deviceId, send) {
        this[_a] = false;
        this[options] = { channel, logLevel, deviceId };
        this[sendPacket] = send;
    }
    [(_a = isInitialized, exports.initController)]() {
        return new Promise((resolve, reject) => {
            this[rvlWorker] = child_process_1.fork(path_1.join(__dirname, 'worker.js'), [JSON.stringify(this[options])]);
            this[rvlWorker].on('error', reject);
            this[rvlWorker].on('exit', (code) => {
                throw new Error(`Internal Error: worker thread unexpectedly quit with code ${code}`);
            });
            this[rvlWorker].on('message', (message) => {
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
                        case 'sendPacket':
                            this[sendPacket](message);
                            break;
                        default:
                            throw new Error(`Internal Error: received unknown message type "${message.type}" from child process`);
                    }
                }
            });
        });
    }
    [exports.processPacket](packet) {
        const message = {
            type: 'receivedPacket',
            payload: packet.toString('base64')
        };
        this[rvlWorker].send(message);
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
        this[rvlWorker].send(message);
    }
    setPowerState(newPowerState) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setPowerState" before calling "init"');
        }
        const message = {
            type: 'setPowerState',
            powerState: newPowerState
        };
        this[rvlWorker].send(message);
    }
    setBrightness(newBrightness) {
        if (!this[isInitialized]) {
            throw new Error('Cannot call "setBrightness" before calling "init"');
        }
        const message = {
            type: 'setBrightness',
            brightness: newBrightness
        };
        this[rvlWorker].send(message);
    }
}
exports.RVLController = RVLController;
//# sourceMappingURL=controller.js.map