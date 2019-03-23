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
const index_1 = require("./index");
console.log('Initializing');
const rvl = new index_1.RVL({
    networkInterface: 'eth0',
    logLevel: 'debug',
    mode: 'controller'
});
rvl.on('initialized', () => {
    console.log('Starting loop');
    rvl.start();
    setTimeout(() => {
        rvl.setWaveParameters({
            timePeriod: 100,
            distancePeriod: 200,
            waves: [
                {
                    h: { a: 1, b: 2, w_t: 3, w_x: 4, phi: 5 },
                    s: { a: 6, b: 7, w_t: 8, w_x: 9, phi: 10 },
                    v: { a: 11, b: 12, w_t: 13, w_x: 14, phi: 15 },
                    a: { a: 16, b: 17, w_t: 18, w_x: 19, phi: 20 },
                },
                {
                    h: { a: 21, b: 22, w_t: 23, w_x: 24, phi: 25 },
                    s: { a: 26, b: 27, w_t: 28, w_x: 29, phi: 30 },
                    v: { a: 31, b: 32, w_t: 33, w_x: 34, phi: 35 },
                    a: { a: 36, b: 37, w_t: 38, w_x: 39, phi: 40 }
                },
                {
                    h: { a: 41, b: 42, w_t: 43, w_x: 44, phi: 45 },
                    s: { a: 46, b: 47, w_t: 48, w_x: 49, phi: 50 },
                    v: { a: 51, b: 52, w_t: 53, w_x: 54, phi: 55 },
                    a: { a: 56, b: 57, w_t: 58, w_x: 59, phi: 60 }
                },
                {
                    h: { a: 61, b: 62, w_t: 63, w_x: 64, phi: 65 },
                    s: { a: 66, b: 67, w_t: 68, w_x: 69, phi: 70 },
                    v: { a: 71, b: 72, w_t: 73, w_x: 74, phi: 75 },
                    a: { a: 76, b: 77, w_t: 78, w_x: 79, phi: 80 }
                }
            ]
        });
    }, 1000);
});
rvl.on('waveParametersUpdated', (parameters) => {
    console.log('Wave Parameters Updated:');
    console.log(JSON.stringify(parameters, null, '  '));
    console.log();
});
//# sourceMappingURL=test.js.map