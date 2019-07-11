# RVL Node

A Node.js implementation of [rvl](https://github.com/nebrius/rvl) based on Web Assembly.

## Installation

Install using npm:

```bash
npm install rvl-node
```

## Usage

The below code instantiates an RVL instance in controller mode, and then sets the animation pattern to be displayed on
all other RVL devices listening on channel 1.

```typescript
import { RVL } from 'rvl-node';
import { createWaveParameters, createSolidColorWave } from 'rvl-node-animations';

const rvl = new RVL({
  networkInterface: 'wlan0',
  mode: 'controller',
  channel: 1
});

rvl.on('initialized', () => {
  rvl.start();
  rvl.setWaveParameters(createWaveParameters(
    createSolidColorWave(0, 255, 255) // Set the LED animation to solid red in the HSV space
  ));
});
```

To create a receiver that listens for changes to the animation, we can run the below code:

```typescript
import { RVL } from 'rvl-node';
import { createWaveParameters, createSolidColorWave } from 'rvl-node-animations';

const rvl = new RVL({
  networkInterface: 'wlan0',
  mode: 'receiver',
  channel: 1
});

rvl.on('initialized', () => {
  rvl.start()
});

rvl.on('waveParametersUpdated', (waveParameters) => {
  console.log('Wave parameters updated', waveParameters);
});
```

# License

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
