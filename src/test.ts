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

import { createRvl, createSolidColorWave, createPulsingWave } from './index';

(async () => {
  const rvl = createRvl();

  console.log(`RVL instance created on network interface ${rvl.networkInterface}, ` +
    `port ${rvl.port}, with node ID ${rvl.nodeId}`);

  const controller = await rvl.createController({
    channel: 0
  });

  controller.setWaveParameters({
    waves: [
      createPulsingWave(0, 255, 1),
      createSolidColorWave(180, 255, 255)
    ]
  });

})();
