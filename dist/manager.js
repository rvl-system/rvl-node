import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import { createEmptyAnimation } from './animation.js';
import { getAvailableInterfaces, getDefaultInterface } from './net.js';
const DEFAULT_PORT = 4978;
const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
const PACKET_TYPE_SYSTEM = 1;
// const PACKET_TYPE_DISCOVER = 2; // Not used
const PACKET_TYPE_CLOCK_SYNC = 3;
const PACKET_TYPE_ANIMATION = 4;
// Private and friend class properties
export const initManager = Symbol();
let id = 0;
export class RVLManager {
    #socket;
    #serverNetworkInterface;
    #serverAddress;
    #serverPort;
    #serverDeviceId;
    #animationPackets = new Map();
    #systemPackets = new Map();
    get networkInterface() {
        return this.#serverNetworkInterface;
    }
    get address() {
        return this.#serverAddress;
    }
    get port() {
        return this.#serverPort;
    }
    get deviceId() {
        return this.#serverDeviceId;
    }
    constructor({ networkInterface, port = DEFAULT_PORT, } = {}) {
        if (!networkInterface) {
            networkInterface = getDefaultInterface();
            if (!networkInterface) {
                throw new Error('Could not determine a usable default network interface');
            }
        }
        const address = this.#getAddressForInterface(networkInterface);
        this.#serverNetworkInterface = networkInterface;
        this.#serverAddress = address;
        const addressOctets = this.#serverAddress.split('.');
        if (addressOctets.length !== 4) {
            throw new Error(`Internal Error: could not parse server IP address`);
        }
        this.#serverDeviceId = parseInt(addressOctets[3], 10);
        this.#serverPort = port;
    }
    [initManager]() {
        return new Promise((resolve) => {
            this.#socket = createSocket({
                type: 'udp4',
                reuseAddr: true,
            });
            this.#socket.on('error', (err) => {
                console.error(err);
                this.#socket?.close();
            });
            this.#socket.bind(this.#serverPort, this.#serverAddress);
            this.#socket.on('listening', () => {
                if (!this.#socket) {
                    throw new Error('Internal Error: this[socket] is unexpectedly undefined. This is a bug');
                }
                this.#socket.setBroadcast(true);
                resolve();
            });
            // TODO: need to do time slicing for the below:
            // Send reference broadcast packets at a regular interval
            setInterval(() => {
                this.#sendReferenceBroadcast({ isFirst: true });
                setTimeout(() => {
                    this.#sendReferenceBroadcast({ isFirst: false });
                    setTimeout(() => {
                        this.#sendReferenceBroadcast({ isFirst: false });
                    }, 100);
                }, 100);
            }, 2000);
            // Send animation packets at a regular interval
            setInterval(() => {
                for (const packet of this.#animationPackets.values()) {
                    this.#sendPacket(packet);
                }
            }, 1000);
            // Send system packets at a regular interval
            setInterval(() => {
                for (const packet of this.#systemPackets.values()) {
                    this.#sendPacket(packet);
                }
            }, 1000);
        });
    }
    setAnimationParameters(channel, parameters) {
        this.#validateChannel(channel);
        if (parameters.animations.length > MAX_NUM_WAVES) {
            throw new Error(`Only ${MAX_NUM_WAVES} waves max are supported`);
        }
        if (typeof parameters.timePeriod !== 'number') {
            parameters.timePeriod = DEFAULT_TIME_PERIOD;
        }
        if (typeof parameters.distancePeriod !== 'number') {
            parameters.distancePeriod = DEFAULT_DISTANCE_PERIOD;
        }
        // Construct the payload
        const message = Buffer.alloc(16);
        message.writeUInt8(parameters.timePeriod);
        message.writeUInt8(parameters.distancePeriod);
        for (let i = 0; i < MAX_NUM_WAVES; i++) {
            const animation = parameters.animations[i] ?? createEmptyAnimation();
            for (const channel of Object.values(animation)) {
                message.writeUInt8(channel.a);
                message.writeUInt8(channel.b);
                message.writeUInt8(channel.w_t);
                message.writeUInt8(channel.w_x);
                message.writeUInt8(channel.phi);
            }
        }
        // Create the packet and store it
        const newAnimationPacket = this.#createPacket({
            packetType: PACKET_TYPE_ANIMATION,
            message,
            channel,
        });
        this.#animationPackets.set(channel, newAnimationPacket);
        // Send the packet immediately to update receivers
        this.#sendPacket(newAnimationPacket);
    }
    setPowerState(channel, newPowerState) {
        this.#validateChannel(channel);
        const message = Buffer.alloc(16);
        message.writeUInt8(newPowerState ? 1 : 0); // Power state
        message.writeUInt8(255); // Brightness, which we don't support
        message.writeUInt16LE(0); // Reserved
        this.#sendPacket(this.#createPacket({ packetType: PACKET_TYPE_SYSTEM, message, channel }));
    }
    #createPacket({ packetType, message, channel, }) {
        if (!this.#socket) {
            throw new Error('Internal Error: this.#socket is unexpectedly undefined. This is a bug');
        }
        // Header
        const payload = Buffer.alloc(8 + message.length);
        payload.write('RVLX', 'ascii');
        payload.writeUInt8(1); // Protocol version
        payload.writeUInt8(channel ?? 255); // Destination channel, default to broadcast
        payload.writeUInt8(this.#serverDeviceId);
        payload.writeUInt8(packetType);
        // Append the message
        message.copy(payload, 8);
        return payload;
    }
    #sendPacket(packet) {
        if (!this.#socket) {
            throw new Error('Internal Error: this.#socket is unexpectedly undefined. This is a bug');
        }
        // Send the payload. We always broadcast, even when doing multicast
        const address = `255.255.255.255`;
        this.#socket.send(packet, this.#serverPort, address);
    }
    #sendReferenceBroadcast({ isFirst }) {
        const message = Buffer.alloc(16);
        message.writeUInt8(1); // Reference broadcast
        message.writeUint16LE(id++);
        message.writeUint8(0); // Reserved
        message.writeUint8(isFirst ? 1 : 0);
        message.writeUint8(0); // Reserved
        this.#sendPacket(this.#createPacket({ packetType: PACKET_TYPE_CLOCK_SYNC, message }));
    }
    #getAddressForInterface(networkInterface) {
        const interfaces = networkInterfaces();
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
    #validateChannel(channel) {
        if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
            throw new Error(`Channel must be an integer between 0 and 255`);
        }
    }
}
//# sourceMappingURL=manager.js.map