# RVL Setup

A web app for configuring the boards on an [rvl](https://github.com/rvl-system/rvl) network. It runs on a laptop joined to the fleet's WiFi, lists every board that answers, and sets each one's channel, brightness, pixel count, current limit, color order, status LED brightness and nickname over the wire, through [RVL Node](https://github.com/rvl-system/rvl-node). The boards store what they are given, so a setting made here survives a reboot.

It runs from this checkout and is not published: the server runs its TypeScript directly, which Node does for a checkout and refuses for a package under `node_modules`.

## Requirements

- Node.js 24 or later.
- The laptop on the fleet's WiFi with the coordinator up. RVL Node needs an interface with an IPv4 address that isn't self-assigned, and a device ID from the coordinator before it can talk to the boards.
- No other RVL Node on the same machine. It binds UDP port 4979, and rvl-setup exits with a message if another instance holds it.
- Boards and a coordinator flashed with firmware from the same change as the RVL Node release in `package.json`, since the wire changes with them.

## Running it

```bash
npm install
npm run build
npm start
```

`npm start` prints two URLs: `http://localhost:4980`, and the same page by the laptop's address on the fleet interface, which a phone on the same WiFi can open. Options go after `--`:

- `--port <number>`: the HTTP port, 4980 by default.
- `--interface <name>`: the network interface to join the fleet on, such as `en0`. By default RVL Node picks the first usable one, and a name that isn't usable exits with the list of those that are.
- `--dev`: the development mode under [Developing](#developing).

A start without a built page exits with one line saying to run `npm run build`.

## The page

The header shows whether the page is connected to the server and whether the server is on the fleet, with its device ID and interface. Below it, every board that has answered is a tile with its nickname, or _unnamed_, its device ID, and an Identify button, which flashes that board's strip and status LED white for five seconds so you can tell which one it is. The server asks the boards to report themselves every five seconds while a page is open. A board that misses a listing is marked as not answering, one that misses three is dropped, and either comes back when it answers again.

Tapping a tile opens the board's settings, under its device ID, which save as they change, with no save button:

- **Channel** and **Color order** are dropdowns and save on selection.
- **Brightness** and **Status LED brightness** are sliders. The board follows the slider as it moves, and the released value is the one it keeps.
- **Pixel count**, **Current limit** and **Nickname** edit behind a pencil, in a dialog with Save and Cancel, since typing them would send a change per keystroke. The pixel count is 1 to 300, the size of the firmware's strip buffer. The current limit is the continuous rating, in mA, of what feeds the strip: its USB connector or cable, or its own supply. The board scales brightness down on any frame that would draw more, and a limit under about 1 mA per pixel leaves the strip black. Boards start at 1500. The nickname is up to 16 characters, and empty means none.

A setting the board doesn't honor is disabled with the reason: a controller board sets its channel and brightness on its own screen, and a board without a status LED has no brightness for it. Everything is disabled while the server is off the fleet. Each control shows a spinner while the board is answering, and the board's error, such as "Node 3 did not answer", when it doesn't. The controls show what the board last reported, so a value the board clamped or ignored shows as the board applied it, and a change made from another page, or by a dial on a controller board, shows within a listing.

## Developing

```bash
npm run dev
```

This runs the same server with Vite inside it: an edit to the page lands without a reload, and an edit to the server restarts it. Vite's hot reload uses its own WebSocket on port 24678. The other scripts are `npm test` for the Vitest suite, which drives the server through its WebSocket with RVL Node mocked and the page's store through a fake socket, `npm run typecheck`, `npm run lint`, and `npm run build`, which builds the page into `dist/client`.

## License

GPL-3.0, see [LICENSE](LICENSE).
