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
let wasmExports;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
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
function handleParsePacket() {
    return 16;
}
function handleRead8() {
    return 8;
}
function handleRead16() {
    return 16;
}
function handleRead32() {
    return 32;
}
function handleRead(ptr, len) {
    const view = new Uint8Array(memory.buffer, ptr, len);
    for (let i = 0; i < len; i++) {
        view[i] = i + 2;
    }
}
function init(ifaceName, cb) {
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
    socket = dgram_1.createSocket('udp4');
    socket.bind(SERVER_PORT, address);
    deviceId = parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
    broadcastAddress = address.substring(0, address.lastIndexOf('.')) + '.255';
    fs_1.readFile(path_1.join(__dirname, 'output.wasm'), (readErr, buf) => {
        if (readErr) {
            cb(readErr);
            return;
        }
        const bytes = new Uint8Array(buf);
        const env = {
            ...output_1.asmLibraryArg,
            table: new WebAssembly.Table({
                initial: output_1.tableInitial,
                maximum: output_1.tableMaximum,
                element: 'anyfunc'
            }),
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
            ...output_1.asmGlobalArg
        };
        WebAssembly.instantiate(bytes, { env, global })
            .then((result) => {
            wasmExports = result;
            wasmExports.instance.exports._init();
            setImmediate(() => cb());
        })
            .catch((err) => setImmediate(() => cb(err)));
    });
}
exports.init = init;
function start() {
    if (!wasmExports) {
        throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
    }
    wasmExports.instance.exports._loop();
    // console.log(wasmExports.instance.exports._add(9, 9));
    // TODO
}
exports.start = start;
function stop() {
    if (!wasmExports) {
        throw new Error(`start called but the wasm module has not been loaded. Was init called?`);
    }
    // TODO
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