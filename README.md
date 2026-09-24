# RVL Node

A Node.js implementation of [rvl](https://github.com/rvl-system/rvl). For a fully functioning example, take a look at the [Home Lights server](https://github.com/nebrius/home-lights/blob/master/server/src/index.ts) I wrote.

## Installation

Install using npm:

```bash
npm install rvl-node
```

## Usage

The below code creates a manager, and then sets the animation pattern to be displayed on all RVL devices listening on
channel 1.

```typescript
import {
  createManager,
  createAnimationParameters,
  createSolidColorAnimation,
} from 'rvl-node';

const manager = await createManager();
await manager.setAnimationParameters(
  1, // Channel 1
  createAnimationParameters(
    createSolidColorAnimation(0, 255, 255) // Hue 0, full saturation, full alpha: solid red
  )
);
```

## API

#### getAvailableInterfaces

Gets the list of available network interfaces that RVL Node can use. To be considered valid, it must have an IPv4 address that isn't self-assigned (`169.254.x.x`), and the name must start with `en`, `eth`, `wlan`, `Wi-Fi`, or `Ethernet`.

_Signature:_

```typescript
function getAvailableInterfaces(): string[];
```

_Arguments:_ none.

_Returns:_ a list of interface names that can be used with RVL Node

#### getDefaultInterface

Gets the default network interface that RVL Node will use, if no value is supplied for `networkInterface` in a call to `createManager`.

_Signature:_

```typescript
function getDefaultInterface(): string | undefined;
```

_Arguments:_ none.

_Returns:_ The name of the interface that will be used, or `undefined` if there is no suitable interface.

#### createManager

Creates the manager that sends animations to the fleet.

_Signature:_

```typescript
interface RVLManagerOptions {
  networkInterface?: string;
}

function createManager(options?: RVLManagerOptions): Promise<RVLManager>;
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
              <td>The network interface to send/receive RVL packets on, e.g. "wlan0". If no value is provided, RVL will use the first interface it can find with an IPv4 address that isn't 127.0.0.1 or self-assigned, and throws if there isn't one. A named interface doesn't need an address yet, so name it if you're starting before the network is up.</td>
            </tr>
          </tbody>
        </table>
      </td>
    <tr>
  </tbody>
</table>

_Returns:_ a promise that resolves to the manager once its socket is listening. Animations set before the coordinator assigns a device ID are sent as soon as its ID is acquired.

### RVL Manager Instance Properties

#### networkInterface: string

This read-only property returns the network interface the manager sends on.

#### deviceId: number | undefined

This read-only property returns the device ID that this manager appears as to other RVL nodes, or `undefined` if the coordinator hasn't assigned one yet. The ID is dropped when the interface loses its address, and may be different when it's reassigned.

#### connected: boolean

This read-only property returns whether the manager has a device ID and can send to the fleet.

### RVL Manager Instance Events

The manager is an [`EventEmitter`](https://nodejs.org/api/events.html).

#### connected

Emitted when the manager receives a device ID.

#### disconnected

Emitted when the manager loses its device ID, which happens when the network interface loses its address.

### RVL Manager Instance Methods

#### setAnimationParameters

Sets the animation parameters for the system on a specific channel. They're sent right away and re-sent every second. You _can_ craft animation parameters by hand, but it's recommended to use the helper functions exported by this package, such as `createAnimationParameters` and `createMovingAnimation`, instead. Crafting parameters by hand is a pain.

_Signature:_

```typescript
setAnimationParameters(channel: number, parameters: AnimationParameters): Promise<void>
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
      <td>The channel number to set the animation parameters for, from 0 to 7.</td>
    </tr>
    <tr>
      <td>parameters</td>
      <td>AnimationParameters</td>
      <td>The animation parameters to set in the system. Throws if there are more than 4 layers, or if a value is out of range for its field: <code>timePeriod</code>, <code>distancePeriod</code>, <code>a</code> and <code>b</code> are 0 to 255, and <code>w_t</code>, <code>w_x</code> and <code>phi</code> are -128 to 127.</td>
    </tr>
  </tbody>
</table>

_Returns:_ a promise that resolves once the packet is sent, or right away if there's no device ID yet.

#### setOff

Turns off the lights on a channel. Off is an animation like any other, so call `setAnimationParameters` to turn them back on.

_Signature:_

```typescript
setOff(channel: number): Promise<void>
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
      <td>The channel number to turn off, from 0 to 7.</td>
    </tr>
  </tbody>
</table>

_Returns:_ a promise that resolves once the packet is sent, or right away if there's no device ID yet.

## License

Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

RVL Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RVL Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with RVL Node. If not, see <http://www.gnu.org/licenses/>.
