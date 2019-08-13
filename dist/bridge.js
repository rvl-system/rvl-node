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
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const dgram_1 = require("dgram");
const output_1 = require("./output");
exports.DEFAULT_TIME_PERIOD = 255;
exports.DEFAULT_DISTANCE_PERIOD = 32;
exports.MAX_NUM_WAVES = 4; // Note: this MUST match the NUM_WAVES define in C++!
function createEmptyWave() {
    const emptyChannel = { a: 0, b: 0, w_x: 0, w_t: 0, phi: 0 };
    return {
        h: { ...emptyChannel },
        s: { ...emptyChannel },
        v: { ...emptyChannel },
        a: { ...emptyChannel }
    };
}
exports.createEmptyWave = createEmptyWave;
function createEmptyWaveParameters() {
    const waves = [];
    for (let i = 0; i < exports.MAX_NUM_WAVES; i++) {
        waves.push({ ...createEmptyWave() });
    }
    return {
        waves,
        timePeriod: exports.DEFAULT_TIME_PERIOD,
        distancePeriod: exports.DEFAULT_DISTANCE_PERIOD
    };
}
exports.createEmptyWaveParameters = createEmptyWaveParameters;
const UPDATE_RATE = 33;
const CLOCK_SYNC_INTERVAL = 2000;
const PACKET_SIGNATURE = ['R'.charCodeAt(0), 'V'.charCodeAt(0), 'L'.charCodeAt(0), 'X'.charCodeAt(0)];
let wasmExports;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
let waveSettingsPointer = 0;
let serverPort = NaN;
let running = false;
let waveSettingsUpdatedCallback = () => {
    // Do nothing
};
let powerStateUpdatedCallback = () => {
    // Do nothing
};
let brightnessUpdatedCallback = () => {
    // Do nothing
};
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
function createInternalErrorMessage(msg) {
    return `Internal Error: ${msg}. 'This is a bug, please file an issue at https://github.com/nebrius/RVL-Node/issues.`;
}
// Logging implementation methods
function memoryToString(ptr, len) {
    const view = new Uint8Array(memory.buffer, ptr, len);
    let string = '';
    for (let i = 0; i < len; i++) {
        string += String.fromCharCode(view[i]);
    }
    return string;
}
function handlePrintString(ptr, len) {
    if (len > 0) {
        process.stdout.write(memoryToString(ptr, len));
    }
}
function handlePrintlnString(ptr, len) {
    if (len > 0) {
        process.stdout.write(memoryToString(ptr, len) + '\n');
    }
    else {
        process.stdout.write('\n');
    }
}
// Platform implementation methods
const startTime = process.hrtime.bigint() / 1000000n;
let deviceId = 0;
function handleGetRelativeTime() {
    return Math.round(Number(process.hrtime.bigint() / 1000000n - startTime));
}
function handleGetDeviceId() {
    return deviceId;
}
function handleOnWaveSettingsUpdated() {
    const view = Buffer.from(memory.buffer, waveSettingsPointer, structData.totalSize);
    const waveSettings = createEmptyWaveParameters();
    for (const entryName in structData.entryDictionary) {
        if (!structData.entryDictionary.hasOwnProperty(entryName)) {
            continue;
        }
        const structEntry = structData.entryDictionary[entryName];
        let value = 0;
        switch (structEntry.type) {
            case 'uint8_t':
                value = view.readUInt8(structEntry.index);
                break;
            case 'int8_t':
                value = view.readInt8(structEntry.index);
                break;
            case 'uint16_t':
                value = view.readUInt16BE(structEntry.index);
                break;
            case 'int16_t':
                value = view.readInt16BE(structEntry.index);
                break;
            case 'uint32_t':
                value = view.readUInt32BE(structEntry.index);
                break;
            case 'int32_t':
                value = view.readInt32BE(structEntry.index);
                break;
            default:
                throw new Error(createInternalErrorMessage(`Encountered unexpected struct type "${structEntry.type}"`));
        }
        switch (structEntry.path.length) {
            case 1:
                waveSettings[structEntry.path[0]]
                    = value;
                break;
            case 2:
                waveSettings[structEntry.path[0]][structEntry.path[1]]
                    = value;
                break;
            case 3:
                waveSettings[structEntry.path[0]][structEntry.path[1]][structEntry.path[2]]
                    = value;
                break;
            case 4:
                waveSettings[structEntry.path[0]][structEntry.path[1]][structEntry.path[2]][structEntry.path[3]]
                    = value;
                break;
            case 5:
                waveSettings[structEntry.path[0]][structEntry.path[1]][structEntry.path[2]][structEntry.path[3]][structEntry.path[4]]
                    = value;
                break;
            case 6:
                waveSettings[structEntry.path[0]][structEntry.path[1]][structEntry.path[2]][structEntry.path[3]][structEntry.path[4]][structEntry.path[5]]
                    = value;
                break;
        }
    }
    waveSettingsUpdatedCallback(waveSettings);
}
function handleOnPowerStateUpdated(powerState) {
    powerStateUpdatedCallback(!!powerState);
}
function handleOnBrightnessUpdated(brightness) {
    brightnessUpdatedCallback(brightness);
}
// Transport implementation methods
let socket;
let broadcastAddress;
let writeBuffer = [];
function handleBeginWrite() {
    writeBuffer = [];
}
function handleWrite8(val) {
    writeBuffer.push(val);
}
function handleWrite16(val) {
    const buf = Buffer.allocUnsafe(2);
    buf.writeUInt16BE(val, 0);
    writeBuffer.push(buf[0], buf[1]);
}
function handleWrite32(val) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(val, 0);
    writeBuffer.push(buf[0], buf[1], buf[2], buf[3]);
}
function handleWriteBuffer(ptr, len) {
    const data = new Uint8Array(memory.buffer, ptr, len);
    writeBuffer.push(...Array.from(data));
}
function handleEndWrite() {
    socket.send(Buffer.from(writeBuffer), serverPort, broadcastAddress);
    writeBuffer = [];
}
let currentReadBuffer;
let currentReadBufferIndex = 0;
const readBuffers = [];
function handleParsePacket() {
    currentReadBuffer = readBuffers.shift();
    currentReadBufferIndex = 0;
    return currentReadBuffer ? currentReadBuffer.length : 0;
}
function handleRead8() {
    if (!currentReadBuffer) {
        throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
    }
    if (currentReadBufferIndex > currentReadBuffer.length - 1) {
        throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
    }
    const value = currentReadBuffer.readUInt8(currentReadBufferIndex);
    currentReadBufferIndex += 1;
    return value;
}
function handleRead16() {
    if (!currentReadBuffer) {
        throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
    }
    if (currentReadBufferIndex > currentReadBuffer.length - 2) {
        throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
    }
    const value = currentReadBuffer.readUInt16BE(currentReadBufferIndex);
    currentReadBufferIndex += 2;
    return value;
}
function handleRead32() {
    if (!currentReadBuffer) {
        throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
    }
    if (currentReadBufferIndex > currentReadBuffer.length - 4) {
        throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
    }
    const value = currentReadBuffer.readUInt32BE(currentReadBufferIndex);
    currentReadBufferIndex += 4;
    return value;
}
function handleRead(ptr, len) {
    if (!currentReadBuffer) {
        throw new Error(createInternalErrorMessage('Attempted to read a UDP packet when there is no UDP packet'));
    }
    if (currentReadBufferIndex > currentReadBuffer.length - len) {
        throw new Error(createInternalErrorMessage('Attempted to read more of a UDP packet than is available'));
    }
    const view = new Uint8Array(memory.buffer, ptr, len);
    for (let i = 0; i < len; i++) {
        view[i] = currentReadBuffer[currentReadBufferIndex++];
    }
}
// External interface methods
function init(networkInterface, port, mode, channel, logLevel, enableClockSync, cb) {
    const interfaces = os_1.networkInterfaces();
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
    if (channel < 0 || channel > 7) {
        throw new Error('Channel must be an integer between 0 and 7');
    }
    deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
    broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';
    serverPort = port;
    let logLevelEnum = 0;
    switch (logLevel) {
        case 'error':
            logLevelEnum = 1;
            break;
        case 'info':
            logLevelEnum = 2;
            break;
        case 'debug':
            logLevelEnum = 3;
            break;
        default:
            throw new Error(`Invalid log level ${logLevel}`);
    }
    fs_1.readFile(path_1.join(__dirname, 'output.wasm'), (readErr, buf) => {
        if (readErr) {
            throw new Error(createInternalErrorMessage(readErr.message));
        }
        const bytes = new Uint8Array(buf);
        const tableArgs = {
            initial: output_1.tableInitial,
            element: 'anyfunc'
        };
        if (typeof output_1.tableMaximum === 'number') {
            tableArgs.maximum = output_1.tableMaximum;
        }
        const env = {
            ...output_1.asmLibraryArg,
            table: new WebAssembly.Table(tableArgs),
            __table_base: output_1.tableBase,
            memory,
            __memory_base: output_1.memoryBase,
            STACKTOP: 0,
            STACK_MAX: memory.buffer.byteLength,
            // Logging
            _jsPrintString: handlePrintString,
            _jsPrintlnString: handlePrintlnString,
            // Platform
            _jsGetRelativeTime: handleGetRelativeTime,
            _jsGetDeviceId: handleGetDeviceId,
            _jsOnWaveSettingsUpdated: handleOnWaveSettingsUpdated,
            _jsOnPowerStateUpdated: handleOnPowerStateUpdated,
            _jsOnBrightnessUpdated: handleOnBrightnessUpdated,
            // Transport Write
            _jsBeginWrite: handleBeginWrite,
            _jsWrite8: handleWrite8,
            _jsWrite16: handleWrite16,
            _jsWrite32: handleWrite32,
            _jsWriteBuffer: handleWriteBuffer,
            _jsEndWrite: handleEndWrite,
            // Transport read
            _jsParsePacket: handleParsePacket,
            _jsRead8: handleRead8,
            _jsRead16: handleRead16,
            _jsRead32: handleRead32,
            _jsRead: handleRead
        };
        const global = {
            ...output_1.asmGlobalArg,
            NaN,
            Infinity
        };
        WebAssembly.instantiate(bytes, { env, global, 'global.Math': Math }).then((result) => {
            wasmExports = result;
            setImmediate(() => {
                waveSettingsPointer = result.instance.exports._init(logLevelEnum, mode === 'controller' ? 1 : 0, channel);
                socket = dgram_1.createSocket({
                    type: 'udp4',
                    reuseAddr: true
                });
                socket.on('message', (msg, rinfo) => {
                    if (rinfo.port !== port || rinfo.address === address) {
                        return;
                    }
                    readBuffers.push(msg);
                });
                socket.on('error', (err) => {
                    console.error(err);
                    socket.close();
                });
                socket.on('listening', () => {
                    const addressInfo = socket.address();
                    console.log(`UDP server listening on ${addressInfo.address}:${addressInfo.port}`);
                    socket.setBroadcast(true);
                    if (enableClockSync) {
                        console.log('Enabling clock sync server');
                        const clockStartTime = Date.now();
                        setInterval(() => {
                            if (!running) {
                                return;
                            }
                            const clockTime = Date.now() - clockStartTime;
                            console.log(`Pinging clock time ${clockTime}`);
                            const msg = new Uint8Array(14);
                            const view = new DataView(msg.buffer);
                            // Signature: 4 bytes = "CLKS"
                            for (let i = 0; i < 4; i++) {
                                view.setUint8(i, PACKET_SIGNATURE[i]);
                            }
                            view.setUint8(4, 1); // Version: 1 byte = 2
                            view.setUint8(5, 240 + channel); // Destination: 1 byte = The channel of this device
                            view.setUint8(6, deviceId); // Source: 1 byte = This device's ID
                            view.setUint8(7, 3); // Packet type: 1 byte = 1: System, 2: Discover, 3: Clock Sync, 4: Wave Animation
                            view.setUint16(8, 0);
                            view.setUint32(10, clockTime); // Clock: 4 bytes = running clock, relative to app start
                            socket.send(msg, port, broadcastAddress);
                        }, CLOCK_SYNC_INTERVAL);
                    }
                    cb();
                });
                socket.bind(port);
            });
        });
    });
}
exports.init = init;
let loopTimer;
function start() {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
    }
    if (running) {
        return;
    }
    running = true;
    function loop() {
        const loopStartTime = process.hrtime.bigint();
        if (wasmExports) {
            wasmExports.instance.exports._loop();
        }
        const now = process.hrtime.bigint();
        const timeConsumed = Number((now - loopStartTime) / 1000000n);
        if (timeConsumed > UPDATE_RATE) {
            console.log(`Warning: system loop took ${timeConsumed - UPDATE_RATE}ms longer than the update rate`);
            setImmediate(loop);
        }
        else {
            loopTimer = setTimeout(loop, UPDATE_RATE - timeConsumed);
        }
    }
    loop();
}
exports.start = start;
function stop() {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
    }
    running = false;
    clearTimeout(loopTimer);
}
exports.stop = stop;
function setWaveParameters(params) {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
    }
    const view = Buffer.from(memory.buffer, waveSettingsPointer, structData.totalSize);
    function writeValue(path, value) {
        if (typeof value === 'number') {
            const structEntry = structData.entryDictionary[path];
            if (!structEntry) {
                throw new Error(createInternalErrorMessage(`Uknown struct path "${path}"`));
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
                    throw new Error(createInternalErrorMessage(`Encountered unexpected struct type "${structEntry.type}"`));
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
            throw new Error(createInternalErrorMessage(`Unsupported value type `));
        }
    }
    for (const param in params) {
        if (!params.hasOwnProperty(param)) {
            continue;
        }
        writeValue(param, params[param]);
    }
    wasmExports.instance.exports._waveParametersUpdated();
}
exports.setWaveParameters = setWaveParameters;
function getAnimationTime() {
    // TODO
    return 0;
}
exports.getAnimationTime = getAnimationTime;
function setBrightness(brightness) {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`setBrightness called but the wasm module has not been loaded`));
    }
    wasmExports.instance.exports._setBrightness(brightness);
}
exports.setBrightness = setBrightness;
function setPowerState(powerState) {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`setPowerState called but the wasm module has not been loaded`));
    }
    wasmExports.instance.exports._setPowerState(powerState ? 1 : 0);
}
exports.setPowerState = setPowerState;
function listenForWaveParameterUpdates(cb) {
    waveSettingsUpdatedCallback = cb;
}
exports.listenForWaveParameterUpdates = listenForWaveParameterUpdates;
function listenForPowerStateUpdates(cb) {
    powerStateUpdatedCallback = cb;
}
exports.listenForPowerStateUpdates = listenForPowerStateUpdates;
function listenForBrightnessUpdates(cb) {
    brightnessUpdatedCallback = cb;
}
exports.listenForBrightnessUpdates = listenForBrightnessUpdates;
//# sourceMappingURL=bridge.js.map