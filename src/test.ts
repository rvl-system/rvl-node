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

import { RVL } from './index';

console.log('Initializing');

const rvl = new RVL({
  networkInterface: 'wlan0',
  logLevel: 'debug',
  mode: 'controller'
});

rvl.on('initialized', () => {
  console.log('Starting loop');
  rvl.start();
  setTimeout(() => {
    rvl.setWaveParameters({
      waves: [
        {
          h: { a: 0, b: 190, w_t: 0, w_x: 0, phi: 0 },
          s: { a: 0, b: 255, w_t: 0, w_x: 0, phi: 0 },
          v: { a: 0, b: 255, w_t: 0, w_x: 0, phi: 0 },
          a: { a: 255, b: 0, w_t: 2, w_x: 0, phi: 0 },
        },
        {
          h: { a: 0, b: 80, w_t: 0, w_x: 0, phi: 0 },
          s: { a: 0, b: 255, w_t: 0, w_x: 0, phi: 0 },
          v: { a: 0, b: 255, w_t: 0, w_x: 0, phi: 0 },
          a: { a: 0, b: 255, w_t: 0, w_x: 0, phi: 0 },
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
