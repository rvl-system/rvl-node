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
const output_1 = require("./output");
const startTime = process.hrtime.bigint() / 1000000n;
let ifaceName = '';
let wasmExports;
const memory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
function memoryToString(ptr, len) {
    const view = new Uint8Array(memory.buffer, ptr, len);
    let string = '';
    for (let i = 0; i < len; i++) {
        string += String.fromCharCode(view[i]);
    }
    return string;
}
function handlePrintChar(charCode) {
    process.stdout.write(String.fromCharCode(charCode));
}
function handlePrintlnChar(charCode) {
    process.stdout.write(String.fromCharCode(charCode) + '\n');
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
function handleGetRelativeTime() {
    return Math.round(Number(process.hrtime.bigint() / 1000000n - startTime));
}
function handleGetDeviceId() {
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
    return parseInt(address.substring(address.lastIndexOf('.') + 1), 10);
}
function init(newIfaceName, cb) {
    ifaceName = newIfaceName;
    const interfaces = os_1.networkInterfaces();
    const iface = interfaces[ifaceName];
    if (!iface) {
        throw new Error(`Unknown network interface ${ifaceName}. ` +
            `Valid options are ${Object.keys(interfaces).join(', ')}`);
    }
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
            _jsPrintChar: handlePrintChar,
            _jsPrintString: handlePrintString,
            _jsPrintlnChar: handlePrintlnChar,
            _jsPrintlnString: handlePrintlnString,
            _jsGetRelativeTime: handleGetRelativeTime,
            _jsGetDeviceId: handleGetDeviceId
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