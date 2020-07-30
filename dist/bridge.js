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
exports.receivePacket = exports.setBrightness = exports.setPowerState = exports.setWaveParameters = exports.init = void 0;
const util_1 = require("./util");
const Module = require("./output");
const UPDATE_RATE = 33;
let cInit;
let cLoop;
Module.onRuntimeInitialized = () => {
    cInit = Module.cwrap('init', null, ['number', 'number']);
    cLoop = Module.cwrap('loop', null, []);
};
async function init(logLevel, channel) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
        throw new Error(`Channel "${channel} is invalid. The channel must be an integer between 0 and 7 (inclusive)`);
    }
    while (!cInit || !cLoop) {
        await util_1.wait(10);
    }
    cInit(logLevel, channel);
    setImmediate(loop);
}
exports.init = init;
function loop() {
    if (!cLoop) {
        throw new Error(`Internal Error: cLoop is unepexctedly undefined`);
    }
    // Run one iteration of the loop
    const loopStartTime = process.hrtime.bigint();
    cLoop();
    const now = process.hrtime.bigint();
    // Calculate how long until we should run the loop again, and run it then
    const timeConsumed = Number((now - loopStartTime) / 1000000n);
    if (timeConsumed > UPDATE_RATE) {
        console.log(`[Warn ]: system loop took ${timeConsumed - UPDATE_RATE}ms longer than the update rate`);
        setImmediate(loop);
    }
    else {
        setTimeout(loop, UPDATE_RATE - timeConsumed);
    }
}
function setWaveParameters(newWaveParameters) {
    // TODO
}
exports.setWaveParameters = setWaveParameters;
function setPowerState(newPowerState) {
    // TODO
}
exports.setPowerState = setPowerState;
function setBrightness(newBrightness) {
    // TODO
}
exports.setBrightness = setBrightness;
function receivePacket(packet) {
    // TODO
}
exports.receivePacket = receivePacket;
//# sourceMappingURL=bridge.js.map