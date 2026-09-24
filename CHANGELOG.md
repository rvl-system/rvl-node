## 8.0.0 (unreleased)

8.0.0 needs firmware and a coordinator that speak the new RVLA/RVLI wire protocol, and changes the API in the ways below.

Breaking changes:

- Removed reference broadcasts, since the coordinator sends them now
- Device IDs are now assigned by the coordinator instead of being derived from the IP address. `deviceId` is `undefined` until then, and animations set in the meantime are sent once it arrives
- Replaced `setPowerState` with `setOff`. Off is an animation, so call `setAnimationParameters` to turn a channel back on
- Channels must now be 0 through 7, and `setAnimationParameters` and `setOff` throw for anything else, including values that used to work
- Removed the `port` option and the `port` and `address` properties

Other changes:

- Added a `connected` property and `connected`/`disconnected` events
- Off is now re-sent every second, like animations
- Packets are now sent to the interface's subnet broadcast address instead of `255.255.255.255`
- The network interface no longer needs an IP address when the manager is created

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
