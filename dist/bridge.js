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
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const dgram_1 = require("dgram");
const output_1 = require("./output");
const UPDATE_RATE = 33;
let wasmExports;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
let waveSettingsPointer = 0;
let serverPort = NaN;
const structData = JSON.parse(fs_1.readFileSync(path_1.join(__dirname, 'structInfo.json')).toString());
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
function init(networkInterface, port, mode, logLevel, cb) {
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
                waveSettingsPointer = result.instance.exports._init(logLevelEnum, mode === 'controller' ? 1 : 0);
                socket = dgram_1.createSocket({
                    type: 'udp4',
                    reuseAddr: true
                });
                socket.on('message', (msg, rinfo) => {
                    if (rinfo.port !== port) {
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
    clearTimeout(loopTimer);
}
exports.stop = stop;
function setWaveParameters(params) {
    if (!wasmExports) {
        throw new Error(createInternalErrorMessage(`start called but the wasm module has not been loaded`));
    }
    const view = new Uint8Array(memory.buffer, waveSettingsPointer, structData.totalSize);
    function writeValue(path, value) {
        if (typeof value === 'number') {
            const structEntry = structData.entryDictionary[path];
            if (!structEntry) {
                throw new Error(createInternalErrorMessage(`Uknown struct path "${path}"`));
            }
            switch (structEntry.size) {
                case 1:
                    view[structEntry.index] = value & 0xFF;
                    break;
                case 2:
                    view[structEntry.index] = (value >> 8) & 0x00F;
                    view[structEntry.index + 1] = value & 0x00FF;
                    break;
                case 4:
                    view[structEntry.index] = (value >> 24) & 0x000000FF;
                    view[structEntry.index + 1] = (value >> 16) & 0x000000FF;
                    view[structEntry.index + 2] = (value >> 8) & 0x000000FF;
                    view[structEntry.index + 3] = value & 0x000000FF;
                    break;
                default:
                    throw new Error(createInternalErrorMessage(`Encountered unexepcted struct entry size ${structEntry.size}`));
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
function listenForWaveParameterUpdates(cb) {
    // TODO
}
exports.listenForWaveParameterUpdates = listenForWaveParameterUpdates;
//# sourceMappingURL=bridge.js.map