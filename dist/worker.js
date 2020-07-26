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
const worker_threads_1 = require("worker_threads");
console.log(worker_threads_1.workerData);
if (!worker_threads_1.parentPort) {
    throw new Error('This file must be executed in a worker thread');
}
worker_threads_1.parentPort.on('message', (message) => {
    switch (message.type) {
        case 'setWaveParameters':
            console.log(message);
        case 'setBrightness':
            console.log(message);
        case 'setPowerState':
            console.log(message);
        default:
            throw new Error(`Internal Error: received unknown parent thread message type ${message.type}`);
    }
});
const initMessage = {
    type: 'initComplete'
};
worker_threads_1.parentPort.postMessage(initMessage);
//# sourceMappingURL=worker.js.map