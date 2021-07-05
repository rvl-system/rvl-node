# RVL Node

A Node.js implementation of [rvl](https://github.com/nebrius/rvl) based on Web Assembly. For a fully functioning example, take a look at the [Home Lights server](https://github.com/nebrius/home-lights/blob/master/server/src/index.ts) I wrote.

## Installation

Install using npm:

```bash
npm install rvl-node
```

## Usage

The below code instantiates an RVL instance in controller mode, and then sets the animation pattern to be displayed on
all other RVL devices listening on channel 1.

```typescript
import { createManager } from 'rvl-node';
import { createWaveParameters, createSolidColorWave } from 'rvl-node-animations';

async function run() {
  const manager = await createManager();
  const controller = await manager.createController({
    channel: 1
  });
  controller.setWaveParameters(createWaveParameters(
    createSolidColorWave(0, 255, 255) // Set the LED animation to solid red in the HSV space
  ));
}
run();
```

## API

Note: the signatures below use the [TypeScript](https://www.typescriptlang.org/) definitions for clarity. The types are _not_ enforced in pure JavaScript, so in theory you can mix and match, but honestly I never tested that scenario and have no idea what will happen.

If you're not familiar with TypeScript syntax, there are basically three things you need to know:

1. A variables type is specified after the variable name, and separated by a `:`. For example, `x: number` means we have a variable named `x`, and it's a number.
2. A `?` after the variable name and before the `:` means that the variable is optional. For example, `{ x?: number }` means the `x` property in this object can be left out.

#### getAvailableInterfaces

Gets the list of available network interfaces that RVL Node can use. To be considered valid, it must have an IPv4 address, and the name must start with `en`, `eth`, `wlan`, `Wi-Fi`, or `Ethernet`.

_Signature:_

```typescript
function getAvailableInterfaces(): string[]
```

_Arguments:_ none.

_Returns:_ a list of interface names that can be used with RVL Node

#### getDefaultInterface

Gets the default network interface that RVL Node will use, if no value is supplied for `networkInterface` in a call to `createManager`.

_Signature:_

```typescript
function getDefaultInterface(): string | undefined
```

_Arguments:_ none.

_Returns:_ The name of the interface that will be used, or `undefined` if there is no suitable interface.

#### createManager

Instantiates a new RVL manager, which can be used to create controllers.

_Signature:_

```typescript
interface IRVLManagerOptions {
  networkInterface?: string;
  port?: number;
}

function createManager(options?: IRVLManagerOptions): Promise<RVLManager>
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
      <td>The options to instantiate the RVL manager with</td>
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
              <td>networkInterface (optional)</td>
              <td>string</td>
              <td>The network interface to send/receive RVL packets on, e.g. "wlan0". If no value is provided, RVL will use the first interface it can find with an IPv4 address that's not 127.0.0.1</td>
            </tr>
            <tr>
              <td>port (optional)</td>
              <td>number</td>
              <td>The UDP port to bind to. Default is <code>4978</code>.</td>
            </tr>
          </tbody>
        </table>
      </td>
    <tr>
  </tbody>
</table>

_Returns:_ a promise that resolves to the manager once the manager has been initialized.

### RVL Manager Instance Properties

#### networkInterface: string

This read-only property returns the network interface the manager is bound to.

#### address: string

This read-only property returns the IP address of the network interface the manager is bound to.

#### port: string

This read-only property returns the port the manager is bound to.

#### deviceId: string

This read-only property returns the device ID that this manager will appear as to other RVL nodes. As of this writing, this is the last octet of the IP address.

### RVL Manager Instance Methods

#### createController

Sets the wave parameters for the system. These parameters will be synced to any other RVL devices on this channel within 2 seconds at most. You _can_ craft animation parameters by hand, but it's recommended to use the [rvl-node-animations](https://github.com/nebrius/rvl-node-animations) helper libraries instead. Crafting parameters by hand is a pain.

This method can only be called when the device is in controller mode, and cannot be called until the `initialized` event is emitted.

_Signature:_

```typescript
interface IRVLControllerOptions {
  channel: number;
  logLevel?: LogLevel;
}

function createController(controllerOptions: IRVLControllerOptions): Promise<RVLController>
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
      <td>channel</td>
      <td>number</td>
      <td>The channel number to bind this controller to.</td>
    </tr>
    <tr>
      <td>logLevel</td>
      <td>LogLevel</td>
      <td>The minimum log level to log. RVL controllers can log a lot of debug information if you want to see what it's doing. Default is Debug</td>
    </tr>
  </tbody>
</table>

_Returns:_ a promise that resolves to the controller once the controller has been initialized.

### RVL Controller Instance Properties

#### channel: number

This read-only property returns the channel the controller is bound to

#### logLevel: LogLevel

This read-only property returns the log level the controller was initialized with

### RVL Controller Instance Methods

#### setWaveParameters

Sets the wave parameters for the system. These parameters will be synced to any other RVL devices on this channel within 2 seconds at most. You _can_ craft animation parameters by hand, but it's recommended to use the [rvl-node-animations](https://github.com/nebrius/rvl-node-animations) helper libraries instead. Crafting parameters by hand is a pain.

This method can only be called when the device is in controller mode, and cannot be called until the `initialized` event is emitted.

_Signature:_

```typescript
setWaveParameters(parameters: IWaveParameters): void
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
      <td>parameters</td>
      <td>IWaveParameters</td>
      <td>The wave parameters to set in the system.</td>
    </tr>
  </tbody>
</table>

**Note:** for details on `IWaveParameters`, please see the documentation for [rvl-node-types](https://github.com/nebrius/rvl-node-types).

_Returns:_ none.

#### setPowerState

Sets the power state for the controller. This is a handy way to turn off lights instead of setting the color to black.

_Signature:_

```typescript
setPowerState(newPowerState: boolean): void
```

_Arguments_: The power state, with `true` meaning "on" and `false` meaning "off."

_Returns:_ none

#### setBrightness

Sets the brightness for the controller, between `0` and `255`. This value sets the overall brightness on top of whatever the existing color is. If an existing HSV color is set to a value of `128` and then brightness is also set to `128`, the output color will have a combined brightness of `64`.

_Signature:_

```typescript
setBrightness(newBrightness: number): void
```

_Arguments_: The brightness, between `0` and `255`

_Returns:_ none

## License

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
