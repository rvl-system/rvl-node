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
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("./util");
const nodePlatform_1 = require("./nodePlatform");
const Module = require("./output");
const structData = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, 'structInfo.json')).toString());
const pathSegmentArrayRegex = /^(.*?)\[([0-9]*)\]$/;
for (const entryName in structData.entryDictionary) {
    if (!structData.entryDictionary.hasOwnProperty(entryName)) {
        continue;
    }
    const entry = structData.entryDictionary[entryName];
    const entryPath = entry.name.split('.');
    for (let i = entryPath.length - 1; i >= 0; i--) {
        const match = pathSegmentArrayRegex.exec(entryPath[i]);
        if (match) {
            entryPath.splice(i, 1, match[1], match[2]);
        }
    }
    entry.path = entryPath;
}
let cInit;
let cGetWaveSettingsPointer;
let cUpdateWaveSettings;
let cUpdatePowerState;
let cUpdateBrightness;
Module.onRuntimeInitialized = () => {
    cInit = Module.cwrap('init', null, ['number', 'number', 'number']);
    cGetWaveSettingsPointer = Module.cwrap('getWaveSettingsPointer', 'number', []);
    cUpdateWaveSettings = Module.cwrap('updateWaveSettings', null, []);
    cUpdatePowerState = Module.cwrap('updatePowerState', null, ['number']);
    cUpdateBrightness = Module.cwrap('updateBrightness', null, ['number']);
};
async function init(logLevel, channel, deviceId) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 7) {
        throw new Error(`Channel "${channel} is invalid. The channel must be an integer between 0 and 7 (inclusive)`);
    }
    while (!cInit) {
        await util_1.wait(10);
    }
    cInit(logLevel, channel, deviceId);
}
exports.init = init;
function setWaveParameters(newWaveParameters) {
    if (!cGetWaveSettingsPointer) {
        throw new Error(`Internal Error: cGetWaveSettingsPointer is unexpectedly null`);
    }
    if (!cUpdateWaveSettings) {
        throw new Error(`Internal Error: cGetWaveSettingsPointer is unexpectedly null`);
    }
    const waveSettingsPointer = cGetWaveSettingsPointer();
    const waveSettingsBuffer = Module.HEAPU8.subarray(waveSettingsPointer, waveSettingsPointer + structData.totalSize);
    const view = Buffer.from(waveSettingsBuffer.buffer, waveSettingsPointer, structData.totalSize);
    function writeValue(path, value) {
        if (typeof value === 'number') {
            const structEntry = structData.entryDictionary[path];
            if (!structEntry) {
                throw new Error(`Internal Error: Uknown struct path "${path}"`);
            }
            switch (structEntry.type) {
                case 'uint8_t':
                    view.writeUInt8(value, structEntry.index);
                    break;
                case 'int8_t':
                    view.writeInt8(value, structEntry.index);
                    break;
                case 'uint16_t':
                    view.writeUInt16BE(value, structEntry.index);
                    break;
                case 'int16_t':
                    view.writeInt16BE(value, structEntry.index);
                    break;
                case 'uint32_t':
                    view.writeUInt32BE(value, structEntry.index);
                    break;
                case 'int32_t':
                    view.writeInt32BE(value, structEntry.index);
                    break;
                default:
                    throw new Error(`Internal Error: Encountered unexpected struct type "${structEntry.type}"`);
            }
        }
        else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                writeValue(`${path}[${i}]`, value[i]);
            }
        }
        else if (typeof value === 'object') {
            for (const entry in value) {
                if (!value.hasOwnProperty(entry)) {
                    continue;
                }
                writeValue(`${path}.${entry}`, value[entry]);
            }
        }
        else {
            throw new Error(`Internal Error: Unsupported value type `);
        }
    }
    for (const param in newWaveParameters) {
        if (!newWaveParameters.hasOwnProperty(param)) {
            continue;
        }
        writeValue(param, newWaveParameters[param]);
    }
    cUpdateWaveSettings();
}
exports.setWaveParameters = setWaveParameters;
function setPowerState(newPowerState) {
    if (!cUpdatePowerState) {
        throw new Error(`Internal Error: cUpdatePowerState is unexpectedly null`);
    }
    cUpdatePowerState(newPowerState);
}
exports.setPowerState = setPowerState;
function setBrightness(newBrightness) {
    if (!cUpdateBrightness) {
        throw new Error(`Internal Error: cUpdateBrightness is unexpectedly null`);
    }
    cUpdateBrightness(newBrightness);
}
exports.setBrightness = setBrightness;
function receivePacket(packet) {
    nodePlatform_1.addPacketToQueue(packet);
}
exports.receivePacket = receivePacket;
//# sourceMappingURL=bridge.js.map