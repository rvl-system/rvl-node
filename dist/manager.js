"use strict";
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVLManager = exports.getDefaultInterface = exports.getAvailableInterfaces = exports.initManager = void 0;
const dgram_1 = require("dgram");
const os_1 = require("os");
const controller_1 = require("./controller");
const types_1 = require("./types");
const DEFAULT_PORT = 4978;
const DEFAULT_LOG_LEVEL = types_1.LogLevel.Debug;
const CHANNEL_OFFSET = 240;
const VALID_INTERFACE_PREFIXES = ['en', 'eth', 'wlan', 'Wi-Fi', 'Ethernet'];
// Private and friend class properties
exports.initManager = Symbol();
const getAddressForInterface = Symbol();
const socket = Symbol();
const serverAddress = Symbol();
const serverDeviceId = Symbol();
const serverPort = Symbol();
const serverNetworkInterface = Symbol();
const channels = Symbol();
function getAvailableInterfaces() {
    const interfaces = os_1.networkInterfaces();
    const validInterfaces = [];
    for (const iface in interfaces) {
        if (!interfaces.hasOwnProperty(iface)) {
            continue;
        }
        let isEstimate = false;
        for (const estimate of VALID_INTERFACE_PREFIXES) {
            if (iface.startsWith(estimate)) {
                isEstimate = true;
                break;
            }
        }
        if (!isEstimate) {
            continue;
        }
        const ips = interfaces[iface].filter((e) => !e.internal && e.family === 'IPv4');
        if (ips.length) {
            validInterfaces.push(iface);
        }
    }
    return validInterfaces;
}
exports.getAvailableInterfaces = getAvailableInterfaces;
function getDefaultInterface() {
    return getAvailableInterfaces()[0];
}
exports.getDefaultInterface = getDefaultInterface;
class RVLManager {
    constructor({ networkInterface, port = DEFAULT_PORT } = {}) {
        this[_a] = new Map();
        if (!networkInterface) {
            networkInterface = getDefaultInterface();
            if (!networkInterface) {
                throw new Error('Could not determine a usable default network interface');
            }
        }
        const address = this[getAddressForInterface](networkInterface);
        this[serverNetworkInterface] = networkInterface;
        this[serverAddress] = address;
        const addressOctets = this[serverAddress].split('.');
        if (addressOctets.length !== 4) {
            throw new Error(`Internal Error: could not parse server IP address`);
        }
        this[serverDeviceId] = parseInt(addressOctets[3], 10);
        this[serverPort] = port;
    }
    get networkInterface() {
        return this[serverNetworkInterface];
    }
    get address() {
        return this[serverAddress];
    }
    get port() {
        return this[serverPort];
    }
    get deviceId() {
        return this[serverDeviceId];
    }
    [(_a = channels, exports.initManager)]() {
        return new Promise((resolve, reject) => {
            this[socket] = dgram_1.createSocket({
                type: 'udp4',
                reuseAddr: true
            });
            const header = Buffer.from('RVLX', 'ascii');
            this[socket].on('message', (message, rinfo) => {
                if (rinfo.port !== this[serverPort] || rinfo.address === this[serverAddress]) {
                    return;
                }
                // Check if this is an RVL packet
                if (header.compare(message, 0, 4) === 0) {
                    if (message[4] !== 1) {
                        console.warn(`[warn ]: Received unsupported RVL packet version ${message[4]}`);
                        return;
                    }
                    // Peek at the header to do some pre-processing
                    const destination = message[5];
                    const source = message[6];
                    const channel = message[8];
                    // Ignore our own packets
                    if (source === this[serverDeviceId]) {
                        return;
                    }
                    // Ignore unicast packets meant for a different destination
                    if (destination < CHANNEL_OFFSET && destination !== this[serverDeviceId]) {
                        return;
                    }
                    // If this is a unicast or multicast packet, send it to that controller only
                    if (destination < 255) {
                        const controller = this[channels].get(channel);
                        // If we don't have an active controller, that probably means this
                        // packet was meant for a controller on a different device
                        if (!controller) {
                            return;
                        }
                        controller[controller_1.processPacket](message);
                    }
                    // If this is a broadcast packet, send it to all controllers
                    if (destination === 255) {
                        for (const [, controller] of this[channels].entries()) {
                            controller[controller_1.processPacket](message);
                        }
                    }
                }
            });
            this[socket].on('error', (err) => {
                this[socket].close();
                reject(err);
            });
            this[socket].on('listening', () => {
                this[socket].setBroadcast(true);
                resolve();
            });
            this[socket].on('error', reject);
            this[socket].bind(this[serverPort], this[serverAddress]);
        });
    }
    async createController(controllerOptions) {
        if (this[channels].has(controllerOptions.channel)) {
            throw new Error(`Channel ${controllerOptions.channel} is already in use`);
        }
        const sendPacket = (message) => {
            let address = '';
            if (message.destination >= 240) {
                address = '255.255.255.255';
            }
            else {
                const addressOctets = this[serverAddress].split('.');
                addressOctets[3] = message.destination.toString();
                address = addressOctets.join('.');
            }
            const payload = Buffer.from(message.payload, 'base64');
            this[socket].send(payload, this[serverPort], address);
        };
        const controller = new controller_1.RVLController(controllerOptions.channel, controllerOptions.logLevel || DEFAULT_LOG_LEVEL, this[serverDeviceId], sendPacket);
        this[channels].set(controllerOptions.channel, controller);
        await controller[controller_1.initController]();
        return controller;
    }
    [getAddressForInterface](networkInterface) {
        const interfaces = os_1.networkInterfaces();
        const iface = interfaces[networkInterface];
        if (!iface) {
            throw new Error(`Unknown network interface ${networkInterface}. ` +
                `Valid options are ${Object.keys(getAvailableInterfaces()).join(', ')}`);
        }
        let address;
        for (const binding of iface) {
            if (binding.family === 'IPv4') {
                address = binding.address;
                break;
            }
        }
        if (!address) {
            throw new Error(`Could not find an IPv4 address for interface "${networkInterface}"`);
        }
        return address;
    }
}
exports.RVLManager = RVLManager;
//# sourceMappingURL=manager.js.map