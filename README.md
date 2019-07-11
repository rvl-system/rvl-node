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

To create a receiver that listens for changes to the animation on channel 1 , we can run the below code:

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
  console.log('Wave parameters updated', waveParameters); // Prints the animation set by the controller
});
```

## API

Note: the signatures below use the [TypeScript](https://www.typescriptlang.org/) definitions for clarity. The types are _not_ enforced in pure JavaScript, so in theory you can mix and match, but honestly I never tested that scenario and have no idea what will happen.

If you're not familiar with TypeScript syntax, there are basically three things you need to know:

1. A variables type is specified after the variable name, and separated by a `:`. For example, `x: number` means we have a variable named `x`, and it's a number.
2. A `?` after the variable name and before the `:` means that the variable is optional. For example, `{ x?: number }` means the `x` property in this object can be left out.

#### new RVL(options)

Instantiates a new RVL instance.

**Warning**: although it has never been tested, instantiating more than one RVL instance at a time will _probably_ break.

_Signature:_

```typescript
interface IRVLOptions {
  networkInterface: string;
  channel: number;
  port?: number;
  mode?: 'controller' | 'receiver';
  logLevel?: 'error' | 'info' | 'debug';
  enableClockSync?: boolean;
}

class RVL {
  constructor(options: IRVLOptions)
}
```

_Arguments_:

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>options</td>
      <td>Object</td>
      <td>The options to instantiate the RVL instance with</td>
    </tr>
    <tr>
      <td></td>
      <td colspan="2">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>networkInterface</td>
              <td>string</td>
              <td>The network interface to send/receive RVL packets on, e.g. "wlan0"</td>
            </tr>
            <tr>
              <td>channel</td>
              <td>number</td>
              <td>The channel to communicate on, an integer between <code>0</code> and <code>7</code>.</td>
            </tr>
            <tr>
              <td>port (optional)</td>
              <td>number</td>
              <td>The UDP port to bind to. Default is <code>4978</code>.</td>
            </tr>
            <tr>
              <td>mode (optional)</td>
              <td><code>'controller'</code> | <code>'receiver'</code></td>
              <td>The mode to operate in. Default is <code>'controller'</code></td>
            </tr>
            <tr>
              <td>logLevel (optional)</td>
              <td><code>'error'</code> | <code>'info'</code> | <code>'debug'</code></td>
              <td>The log level for RVL to log with. Default is <code>'info'</code>.</td>
            </tr>
            <tr>
              <td>enableClockSync (optional)</td>
              <td>boolean</td>
              <td>Enables the clock sync server. Defaults to <code>false</code>. Note: this will likely be deprecated soon because there are plans to move away from a centralized clock server to a fully decentralized one.</td>
            </tr>
          </tbody>
        </table>
      </td>
    <tr>
  </tbody>
</table>

### RVL Instance Properties

#### waveParameters

_Signature:_

```typescript
class RVL {
  public get waveParameters(): IWaveParameters
}
```

**Note:** for details on `IWaveParameters`, please see the documentation for [rvl-node-types](https://github.com/nebrius/rvl-node-types).

#### mode

_Signature:_

```typescript
class RVL {
  public get mode(): 'controller' | 'receiver'
}
```

### RVL Instance Methods

#### start()

_Signature:_

```typescript
class RVL {
  public start(): void
}
```

_Arguments_: none.

_Returns:_ none.

#### stop()

_Signature:_

```typescript
class RVL {
  public stop(): void
}
```

_Arguments_: none.

_Returns:_ none.

#### setWaveParameters(parameters)

_Signature:_

```typescript
class RVL {
  public setWaveParameters(parameters: IWaveParameters): void
}
```

_Arguments_:

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
  </tbody>
</body>

_Returns:_ none.

#### getAnimationTime()

_Signature:_

```typescript
class RVL {
  public getAnimationTime(): number
}
```

_Arguments_: none.

_Returns:_ The current animation time across all devices (not based on wall-time).

### RVL Instance Events

#### initialized

_Signature:_

```typescript
rvl.on('initialized', () => void): void;
```

_Arguments_: none.

#### waveParametersUpdated

_Signature:_

```typescript
rvl.on('initialized', (waveParameters: IWaveParameters) => void): void;
```

_Arguments_:

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
  </tbody>
</body>

**Note:** for details on `IWaveParameters`, please see the documentation for [rvl-node-types](https://github.com/nebrius/rvl-node-types).

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
