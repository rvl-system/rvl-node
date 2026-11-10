## Unreleased

RVL Node now lives in the [rvl-js](https://github.com/rvl-system/rvl-js) workspace, where the other packages run it from its TypeScript source. It is not published to npm past 9.0.0.

These changes need firmware from the same change: a board's status packet is 33 bytes, with the current limit after the nickname. Against older firmware RVL Node drops every board's status, so `getNodes` lists nothing and `configureNode` and `identifyNode` reject.

Breaking changes:

- The entry point exports only what another package in the workspace imports. These left it, each to return with its first importer: `setAnimationParameters`, `setOff` and `getEarliestStartFrame`; `getAnimationClock`, `toAnimationClock`, `toLocalTime`, `subtractFrames` and `FRAME_PERIOD`; `createEmptyAnimation`, `createSolidColorAnimation`, `createColorCycleAnimation`, `createMovingAnimation`, `createPulsingAnimation`, `createRainbowAnimation` and `createSimpleWaveParameters`; and the types `AnimationColorParameters`, `AnimationLayer`, `AnimationParameters`, `ColorOrder`, `NodeCapabilities`, `NodeConfiguration` and `SceneOptions`
- Removed `createAnimationParameters`. Parameters with fewer than four layers are padded with empty ones when they are sent, so nothing needs it

New:

- Added `currentLimit` to `NodeConfiguration`, `NodeCapabilities` and `NodeStatus`. It is the continuous rating in mA of what feeds a board's strip, and the board scales its brightness down on any frame that would draw more. `configureNode` sets it, from 1 to `MAX_CURRENT_LIMIT`, and boards default to 1500
- Added `MAX_CURRENT_LIMIT`, 65535, the largest value the current limit's 16-bit field on the wire holds

## 9.0.0 (2026-11-01)

9.0.0 needs firmware from the same change: a board's status packet is 31 bytes, with no mode byte.

Breaking changes:

- Removed `mode` from `NodeStatus`. Device mode changes only from a controller board's own screen, so reporting it over the wire gave a configuration tool nothing it could act on

New:

- Added `NUM_CHANNELS` and `NICKNAME_LENGTH` beside `MAX_PIXEL_COUNT`, so a configuration UI can take its bounds from the package that checks them

## 8.1.0 (2026-11-01)

8.1.0 needs firmware and a coordinator that write the RVLI destination byte, the header's former reserved byte. RVL Node now drops a packet addressed to another node, and boards and coordinators from before the change write zero there, so against them it never gets a device ID.

New:

- Added `getNodes`, which asks every board on the network to report itself and resolves with each board's device ID, mode, settings, and which of the settings it honors
- Added `configureNode`, which sets one property on one board, its channel, brightness, pixel count, color order, status LED brightness or nickname, and resolves with the board's status once it carries the new value. The board stores the setting, so it survives a reboot. A property the board doesn't honor, per its capabilities, is ignored
- Added `identifyNode`, which flashes a board white for five seconds, strip and status LED, so you can tell which physical board an ID is
- All three throw before `connected`. `configureNode` and `identifyNode` reject when the board hasn't answered after two attempts, about two seconds, which makes them the one part of the API that rejects
- Added `MAX_PIXEL_COUNT`, the most pixels a board drives, and the `NodeStatus`, `NodeConfiguration`, `NodeCapabilities` and `ColorOrder` types

Other changes:

- The default fade, taken by a call without `fadeFrames`, is now 32 frames, a second, up from 16, to match the controller boards' own changes
- A `startFrame` read from `getEarliestStartFrame` no longer throws when a frame boundary passes between the two calls; the scene goes out four frames ahead instead of five
- A board's clock-sync observation straggling in from the previous set no longer discards the current set's row, and a set whose start-of-set reference was lost is now processed a reference late instead of being dropped
- An RVLI packet of the wrong length for its type is now dropped, as the boards drop it, where one with trailing bytes used to be decoded

## 8.0.0 (2026-10-08)

8.0.0 needs firmware and a coordinator that speak the new RVLA/RVLI wire protocol, and changes the API in the ways below.

Breaking changes:

- Removed `createManager` and the manager. `init()` sets the package up, returns at once, and finishes in the background; the functions that were methods are now exports, and `on()` subscribes to events. One instance per host: `init()` throws when called twice, and a second process's bind fails
- Every change is now a scene with a start frame and a fade, and the boards dissolve into it together. `setAnimationParameters` and `setOff` take a third argument, `{ startFrame?, fadeFrames? }`. Without a start, a scene is scheduled five frames ahead once the channel's last scene has finished fading, and held until then; with one, it is placed on that frame. The fade is 16 to 255 frames, half a second to eight, and defaults to 16. Nothing takes effect immediately any more
- The promises from `setAnimationParameters` and `setOff` now resolve once the channel has settled, which can be seconds after the call when the scene waited behind a fade, rather than when a packet was sent. They never reject
- Removed reference broadcasts, since the coordinator sends them now
- Device IDs are now assigned by the coordinator instead of being derived from the IP address. `getDeviceId()` is `undefined` until then, and scenes set in the meantime are sent once it arrives
- Replaced `setPowerState` with `setOff`. Off is a scene like any other, so call `setAnimationParameters` to turn a channel back on
- Channels must now be 0 through 7, and `setAnimationParameters` and `setOff` throw for anything else, including values that used to work
- `setAnimationParameters` now throws when a parameter is out of range for its wire field, instead of silently sending a different value
- Removed the `port` option and the `port` and `address` properties
- The package now ships `dist/` only

Other changes:

- Added `connected` and `disconnected` events and `isConnected()`. Connected means a device ID and the fleet clock, so waiting for `connected` is the way to know the fleet can be driven
- Added an `error` event, which carries a failed bind, most likely the port already in use by another instance
- Added the fleet clock: `getAnimationClock()`, `toAnimationClock()`, `toLocalTime()`, `FRAME_PERIOD` and `subtractFrames()`, for placing scenes on a grid, and `getEarliestStartFrame()` for the earliest start a channel can take
- Added `createSimpleWaveParameters()`, the controller boards' Wave preset without its foreground layer
- Scenes are now re-sent every second, off included, and a new scene is sent twice, four frames apart, so a board that loses the first copy gets the second
- Packets are now sent to the interface's subnet broadcast address instead of `255.255.255.255`
- The network interface no longer needs an IP address at `init()`, and a self-assigned `169.254.x.x` address counts as none
- Socket errors after the bind are now logged instead of crashing the process
- Fixed wave layers being scrambled on the wire when their properties weren't defined in h, s, v, a order

## 7.0.3 (2025-11-24)

- Tightened up packet timing to use time slicing

## 7.0.2 (2025-11-21)

- Rewrote the entire stack to not use WASM

## 6.3.1 (2023-11-10)

- Fixed some issues with the build system and rebuilt using newer emscripten to fix bugs

## 6.3.0 (2023-10-01)

- Udated dependencies and build systems to work with the latest version of Node.js

## 6.2.0 (2021-06-06)

- Added `getDefaultInterface` and `getAvailableInterfaces` helper methods.

## < 6.2.0

Unfortunately I did not keep records of changes before 6.2.0, so you'll have to take a look at the commits associated with each release tag to see what changed. Sorry.
