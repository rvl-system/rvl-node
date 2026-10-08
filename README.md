# RVL Node

A Node.js implementation of [rvl](https://github.com/rvl-system/rvl)'s sending side. It joins the fleet's network, follows the fleet clock, and schedules scenes for the boards to show, so a program on a laptop or a Pi can drive the lights the way a controller board does.

For working examples, see the two demos in this repository: [`demo/waves.ts`](demo/waves.ts), which cycles through the built-in animations, and [`demo/scenes.ts`](demo/scenes.ts), which schedules palette shifts on a bar grid at a fixed tempo.

## Requirements

- One RVL Node per host. It binds UDP port 4979 and sends on every channel, so a second instance has nothing to add, and `init` reports an error if one is already running.

## Installation

Install using npm:

```bash
npm install rvl-node
```

## Usage

The code below connects to the fleet and shows solid red on every board listening on channel 1, dissolving in over half a second.

```typescript
import {
  createAnimationParameters,
  createSolidColorAnimation,
  init,
  on,
  setAnimationParameters,
} from 'rvl-node';

init();
on('connected', () => {
  setAnimationParameters(
    1, // Channel 1
    createAnimationParameters(
      createSolidColorAnimation(0, 255, 255) // Hue 0, full saturation, full alpha: solid red
    )
  );
});
```

## How it works

### Scenes

Everything the fleet shows is a scene: an animation, or off, with a start frame and a fade. When a scene starts, every board dissolves from whatever it is showing into the new scene over the fade, so a change lands on all of them at the same instant and looks the same everywhere. Every scene fades, and the shortest fade is 16 frames, about half a second.

`setAnimationParameters` and `setOff` each schedule a scene on a channel. Without a `startFrame`, RVL Node defaults to five frames ahead if the channel's last scene has finished fading, and otherwise it holds the request until that fade ends. A newer request replaces a held one and whatever the boards end up showing is always the latest thing you asked for.

### The fleet clock and frames

The fleet shares an animation clock, a millisecond count the boards agree on through the coordinator's reference broadcasts, and RVL Node follows it. A frame is 32 ms long (31.25 frames per second) and scene starts and fades are counted in frames. Frame numbers wrap every 2^27 frames, so compare them with `subtractFrames` rather than `<`.

The fleet clock is available a few seconds after `init`, and `connected` waits for it as well as for a device ID. Until then the clock accessors throw, scenes without a start are held, and scenes with a start can't be placed, so `setAnimationParameters` and `setOff` throw for those.

## API

### Setup

#### init

Joins the fleet: binds the socket, starts requesting a device ID from the coordinator, and starts following the fleet clock. It returns at once and the rest happens in the background; `connected` says when the fleet can be driven.

_Signature:_

```typescript
interface RVLInitOptions {
  networkInterface?: string;
}

function init(options?: RVLInitOptions): void;
```

_Arguments:_

- `options.networkInterface` (optional): the network interface to send and receive RVL packets on, e.g. "wlan0". Without it, RVL Node uses the first interface `getAvailableInterfaces` lists, and throws if there is none. A named interface doesn't need an address yet, so name it if you're starting before the network is up.

_Returns:_ nothing. It throws if it has already been called, or if no interface is usable. The bind finishes in the background: if port 4979 is already in use, most likely by another RVL Node on the host, an `error` event says so, and `init` may be called again after it.

Every other function below, except `on`, the interface helpers, `subtractFrames` and the animation builders, throws until `init` has been called.

#### on

Subscribes to an event.

_Signature:_

```typescript
function on(event: 'connected' | 'disconnected', listener: () => void): void;
function on(event: 'error', listener: (error: Error) => void): void;
```

`connected` is emitted once this node has a device ID from the coordinator and the fleet clock, in whichever order they arrive, and so can drive the fleet. `disconnected` is emitted when the ID is lost, which happens when the network interface loses its address; `connected` is emitted again when it's reassigned, since the clock stays synced. `error` carries a failed bind. With no listener for it, the error surfaces as an uncaught exception, since Node's emitters throw an unhandled `error`.

#### getDeviceId

_Signature:_

```typescript
function getDeviceId(): number | undefined;
```

_Returns:_ the device ID this node appears as to the fleet, or `undefined` if the coordinator hasn't assigned one yet. The ID is dropped when the interface loses its address, and may be different when it's reassigned.

#### isConnected

_Signature:_

```typescript
function isConnected(): boolean;
```

_Returns:_ whether this node has a device ID and the fleet clock, and so can drive the fleet.

#### getNetworkInterface

_Signature:_

```typescript
function getNetworkInterface(): string;
```

_Returns:_ the name of the interface RVL Node is sending on.

#### getAvailableInterfaces

Gets the list of available network interfaces that RVL Node can use. To be considered valid, an interface must have an IPv4 address that isn't self-assigned (`169.254.x.x`), and its name must start with `en`, `eth`, `wlan`, `Wi-Fi`, or `Ethernet`.

_Signature:_

```typescript
function getAvailableInterfaces(): string[];
```

_Returns:_ a list of interface names that can be used with RVL Node.

#### getDefaultInterface

Gets the network interface `init` will use when none is named.

_Signature:_

```typescript
function getDefaultInterface(): string | undefined;
```

_Returns:_ the name of the interface that will be used, or `undefined` if there is no suitable interface.

### Scenes

#### setAnimationParameters

Schedules an animation on a channel. You _can_ craft animation parameters by hand, but it's recommended to use the helper functions exported by this package, such as `createAnimationParameters` and `createSimpleWaveParameters`, instead. Crafting parameters by hand is a pain.

_Signature:_

```typescript
function setAnimationParameters(
  channel: number,
  parameters: AnimationParameters,
  options?: SceneOptions
): Promise<void>;
```

_Arguments:_

- `channel`: the channel to schedule the animation on, from 0 to 7.
- `parameters`: the animation. Throws if there are more than 4 layers, or if a value is out of range for its field: `timePeriod` and `distancePeriod` are 1 to 255, `a` and `b` are 0 to 255, and `w_t`, `w_x` and `phi` are -128 to 127.
- `options.startFrame` (optional): the fleet frame the scene starts on, an integer from 0 to 2^32 - 1, at or after `getEarliestStartFrame`. Throws if it is earlier, if `getEarliestStartFrame` is `undefined`, or before the first clock sync. Without it the scene is scheduled as described under Scenes.
- `options.fadeFrames` (optional): how many frames the boards take to dissolve from what they are showing into this scene, an integer from 16 to 255 (about 0.5 to 8 s). Defaults to 16.

_Returns:_ a promise that resolves once the channel has settled: no request is being held for it, and the last scene scheduled on it has been sent twice, at once and again four frames later as insurance against a lost packet. That can be some seconds after the call when the scene was held behind a running fade. Before the first clock sync it resolves at once, with the request held. The promise never rejects: without a device ID the sends are skipped but still count, and the scene goes out once the coordinator assigns one.

#### setOff

Turns off the lights on a channel. Off is a scene like any other: it fades in the same way and takes the same options, and `setAnimationParameters` turns the channel back on.

_Signature:_

```typescript
function setOff(channel: number, options?: SceneOptions): Promise<void>;
```

_Arguments:_

- `channel`: the channel to turn off, from 0 to 7.
- `options` (optional): the same options as `setAnimationParameters`.

_Returns:_ a promise that resolves once the channel has settled, as `setAnimationParameters`'s does.

#### getEarliestStartFrame

Gets the earliest frame an explicit `startFrame` can take on a channel right now: five frames ahead, or the end of the running fade if that is later.

_Signature:_

```typescript
function getEarliestStartFrame(channel: number): number | undefined;
```

_Returns:_ that frame, or `undefined` while a scene you scheduled is still ahead or a request is being held, in which case a call with a `startFrame` would throw. Read it again a frame later. A program scheduling on a grid should read it rather than keep its own copy of the channel's state, which goes stale when the fleet clock steps. Throws before the first clock sync.

### The fleet clock

#### getAnimationClock

_Signature:_

```typescript
function getAnimationClock(): number;
```

_Returns:_ the fleet's animation clock now, in milliseconds, which wraps at 2^32. Throws before the first clock sync.

#### toAnimationClock

_Signature:_

```typescript
function toAnimationClock(localTime: number): number;
```

_Returns:_ the animation clock at a local time, as `performance.now()` gives it. Throws before the first clock sync.

#### toLocalTime

_Signature:_

```typescript
function toLocalTime(animationClock: number): number;
```

_Returns:_ the local time, as `performance.now()` gives it, nearest to now that maps to the animation clock value; subtract `performance.now()` from it for a `setTimeout` delay. Throws before the first clock sync.

#### FRAME_PERIOD

The length of a frame in animation clock milliseconds, 32. A frame number is the animation clock divided by it, rounded down.

#### subtractFrames

_Signature:_

```typescript
function subtractFrames(a: number, b: number): number;
```

_Returns:_ the signed number of frames from `b` to `a`, correct across the 2^27 frame wrap for differences of up to 2^26 frames, about 25 days.

### Animation builders

#### createAnimationParameters

Builds a complete parameter set from up to four layers. The layers are composited from the fourth up to the first, each blended over the result by its alpha.

_Signature:_

```typescript
function createAnimationParameters(
  animation1?: AnimationLayer,
  animation2?: AnimationLayer,
  animation3?: AnimationLayer,
  animation4?: AnimationLayer
): AnimationParameters;
```

_Returns:_ parameters with the layers given and empty layers for the rest.

#### createEmptyAnimation

_Signature:_

```typescript
function createEmptyAnimation(): AnimationLayer;
```

_Returns:_ a layer with every field 0, which renders as transparent black.

#### createSolidColorAnimation

_Signature:_

```typescript
function createSolidColorAnimation(
  h: number,
  s: number,
  a: number
): AnimationLayer;
```

_Arguments:_ hue, saturation and alpha, each 0 to 255.

#### createColorCycleAnimation

A layer whose hue cycles through the spectrum, the same color along the whole strip.

_Signature:_

```typescript
function createColorCycleAnimation(rate: number, a: number): AnimationLayer;
```

_Arguments:_ a rate from 1 to 32 and an alpha from 0 to 255.

#### createMovingAnimation

A solid color whose alpha sweeps along the strip.

_Signature:_

```typescript
function createMovingAnimation(
  h: number,
  s: number,
  rate: number,
  spacing: number
): AnimationLayer;
```

_Arguments:_ hue and saturation from 0 to 255, a rate from 0 to 32, and a spacing from 1 to 16.

#### createPulsingAnimation

A solid color whose alpha pulses, the same along the whole strip.

_Signature:_

```typescript
function createPulsingAnimation(
  h: number,
  s: number,
  rate: number
): AnimationLayer;
```

_Arguments:_ hue and saturation from 0 to 255 and a rate from 1 to 32.

#### createRainbowAnimation

A rainbow that moves along the strip.

_Signature:_

```typescript
function createRainbowAnimation(a: number, rate: number): AnimationLayer;
```

_Arguments:_ an alpha from 0 to 255 and a rate from 1 to 32.

#### createSimpleWaveParameters

The controller boards' Wave preset without its foreground layer: a wave in one hue moving over a background in another. The strip's average color holds still while the pattern moves, so a scene change reads as a clean color shift.

_Signature:_

```typescript
function createSimpleWaveParameters(options: {
  rate: number;
  waveHue: number;
  backgroundHue: number;
  brightness: number;
}): AnimationParameters;
```

_Arguments:_ a rate from 0 to 32, the two hues from 0 to 255, and a brightness from 0 to 255 applied to both layers. With one hue on both layers nothing moves, so keep them apart.

_Returns:_ a complete parameter set, the wave in the first layer and the background in the third, as the preset lays them out.

### Types

```typescript
interface AnimationColorParameters {
  a: number; // Amplitude, 0 to 255
  b: number; // Offset, 0 to 255
  w_t: number; // Rate over time, -128 to 127
  w_x: number; // Rate along the strip, -128 to 127
  phi: number; // Phase, -128 to 127
}

interface AnimationLayer {
  h: AnimationColorParameters;
  s: AnimationColorParameters;
  v: AnimationColorParameters;
  a: AnimationColorParameters;
}

interface AnimationParameters {
  timePeriod?: number; // 1 to 255, default 255
  distancePeriod?: number; // 1 to 255, default 32
  animations: AnimationLayer[];
}

interface SceneOptions {
  startFrame?: number;
  fadeFrames?: number;
}
```

Each color component of a layer is `b + a × sin(w_t·t + w_x·x + phi)` with the sine scaled 0 to 1, so it runs from `b` to `a + b`. `t` runs over `timePeriod` tenths of a second and `x` over `distancePeriod` pixels, so `w_t` and `w_x` count cycles per period. The layer's `h`, `s` and `v` make its color, and `a` is its alpha over the layers beneath it.

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
