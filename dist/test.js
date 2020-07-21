"use strict";
/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

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
    networkInterface: 'Wi-Fi',
    logLevel: 'debug',
    mode: 'controller',
    channel: 0
});
rvl.on('initialized', () => {
    console.log('Starting loop');
    rvl.start();
    setTimeout(() => {
        rvl.setWaveParameters({
            waves: [
                index_1.createPulsingWave(0, 255, 1),
                index_1.createSolidColorWave(180, 255, 255)
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