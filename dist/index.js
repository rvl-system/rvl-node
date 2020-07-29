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
const child_process_1 = require("child_process");
const os_1 = require("os");
const types_1 = require("./types");
__export(require("./animation"));
var types_2 = require("./types");
exports.LogLevel = types_2.LogLevel;
const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = types_1.LogLevel.Debug;
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
const channels = new Map();
const isInitialized = Symbol();
const options = Symbol();
const rvlWorker = Symbol();
const init = Symbol();
const interfaces = os_1.networkInterfaces();
let defaultNetworkInterface = '';
const bestKnownIfacePrefixes = ['eth', 'wlan', 'Wi-Fi', 'Ethernet'];
for (const iface in interfaces) {
    if (!interfaces.hasOwnProperty(iface)) {
        continue;
    }
    let isEstimate = false;
    for (const estimate of bestKnownIfacePrefixes) {
        if (iface.startsWith(estimate)) {
            isEstimate = true;
            break;
        }
    }
    if (!isEstimate) {
        continue;
    }
    const ips = interfaces[iface].filter((e) => !e.internal && e.family === 'IPv4');
    if (ips.length) {
        defaultNetworkInterface = iface;
        break;
    }
}
function createRvl(initOptions = {}) {
    initOptions = initOptions || {};
    const networkInterface = initOptions.networkInterface || defaultNetworkInterface;
    const port = initOptions.port || DEFAULT_PORT;
    const iface = interfaces[networkInterface];
    if (!iface) {
        throw new Error(`Unknown network interface ${networkInterface}. ` +
            `Valid options are ${Object.keys(interfaces).join(', ')}`);
    }
    let address;
    for (const binding of iface) {
        if (binding.family === 'IPv4') {
            address = binding.address;
            break;
        }
    }
    if (!address) {
        throw new Error(`Could not find an IPv4 address for interface "${networkInterface}"`);
    }
    return {
        async createController(controllerOptions) {
            if (channels.has(controllerOptions.channel)) {
                throw new Error(`Channel ${controllerOptions.channel} is already in use`);
            }
            const controller = new RVLController(controllerOptions);
            channels.set(controllerOptions.channel, controller);
            await controller[init]();
            return controller;
        },
        get networkInterface() {
            return networkInterface;
        },
        get port() {
            return port;
        },
        get nodeId() {
            return address ? address.split('.')[3] : '';
        }
    };
}
exports.createRvl = createRvl;
class RVLController {
    constructor({ channel, logLevel = DEFAULT_LOG_LEVEL }) {
        this[_a] = false;
        this[options] = { channel, logLevel };
    }
    [(_a = isInitialized, init)]() {
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
                            console.log(message);
                            // TODO
                            break;
                        default:
                            throw new Error(`Internal Error: received unknown message type "${message.type}" from child process`);
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
        channels.delete(this[options].channel);
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
//# sourceMappingURL=index.js.map