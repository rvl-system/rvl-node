## 8.1.0 (unreleased)

- The default fade, taken by a call without `fadeFrames`, is now 32 frames, a second, up from 16, to match the controller boards' own changes
- A `startFrame` read from `getEarliestStartFrame` no longer throws when a frame boundary passes between the two calls
- A board's clock-sync observation straggling in from the previous set no longer discards the current set's row, and a set whose start-of-set reference was lost is now processed a reference late instead of being dropped

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
