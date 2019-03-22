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
const SERVER_PORT = 4978;
const UPDATE_RATE = 33;
let wasmExports;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
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
    socket.send(Buffer.from(writeBuffer), SERVER_PORT, broadcastAddress);
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
    currentReadBufferIndex += 1;
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
    currentReadBufferIndex += 1;
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
function init(ifaceName, logLevel, cb) {
    const interfaces = os_1.networkInterfaces();
    const iface = interfaces[ifaceName];
    if (!iface) {
        throw new Error(`Unknown network interface ${ifaceName}. ` +
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
        throw new Error(`Could not find an IPv4 address for interface "${ifaceName}"`);
    }
    deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
    broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';
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
            cb(readErr);
            return;
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
                result.instance.exports._init(logLevelEnum);
                socket = dgram_1.createSocket({
                    type: 'udp4',
                    reuseAddr: true
                });
                socket.on('message', (msg, rinfo) => {
                    if (rinfo.port !== SERVER_PORT) {
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
                socket.bind(SERVER_PORT, address);
            });
        });
    });
}
exports.init = init;
let loopTimer;
function start() {
    if (!wasmExports) {
        throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
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
        throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
    }
    clearTimeout(loopTimer);
}
exports.stop = stop;
function setWaveParameters(params) {
    if (!wasmExports) {
        throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
    }
    if (typeof params.distancePeriod === 'undefined') {
        params.distancePeriod = 255;
    }
    if (typeof params.timePeriod === 'undefined') {
        params.timePeriod = 32;
    }
    wasmExports.instance.exports._setWaveParameters();
    // TODO
}
exports.setWaveParameters = setWaveParameters;
//# sourceMappingURL=index.js.map