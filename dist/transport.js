import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import {} from "./buffer.js";
import { RVLI_PORT } from "./config.js";
import { emit } from "./events.js";
import { isUsableAddress } from "./net.js";
let transport;
function getBroadcastAddress({ address, netmask }) {
    const netmaskOctets = netmask.split('.').map(Number);
    return address
        .split('.')
        .map((octet, i) => Number(octet) | (~netmaskOctets[i] & 0xff))
        .join('.');
}
function parseAddress(address) {
    return address
        .split('.')
        .reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
}
function isOnSubnet(address, { address: own, netmask }) {
    const mask = parseAddress(netmask);
    return (parseAddress(address) & mask) === (parseAddress(own) & mask);
}
// The socket exists from init() on, so this is what every public function
// checks first
function getTransport() {
    if (!transport) {
        throw new Error('rvl-node is not initialized yet. Call init()');
    }
    return transport;
}
export function assertInitialized() {
    getTransport();
}
export function isInitialized() {
    return transport !== undefined;
}
export function getNetworkInterface() {
    return getTransport().networkInterface;
}
// Creates the socket and starts the bind, which finishes in the background:
// onListening runs once the port is bound, and a failed bind leaves nothing
// running and is reported as an error event, so init() may be tried again
export function bindTransport(networkInterface, onMessage, onListening) {
    const socket = createSocket({ type: 'udp4' });
    let listening = false;
    socket.on('error', (err) => {
        if (listening) {
            console.error(err);
            return;
        }
        socket.close();
        transport = undefined;
        if ('code' in err && err.code === 'EADDRINUSE') {
            emit('error', new Error(`UDP port ${RVLI_PORT} is already in use on this host, most ` +
                'likely by another rvl-node process. Running more than one ' +
                'rvl-node instance per host is unsupported, and one instance ' +
                'sends on every channel.', { cause: err }));
        }
        else {
            emit('error', err);
        }
    });
    socket.on('message', (message, remote) => {
        // Read first, so the arrival time doesn't include the filtering
        const arrivalTime = performance.now();
        const interfaceAddress = getInterfaceAddress();
        if (interfaceAddress && isOnSubnet(remote.address, interfaceAddress)) {
            onMessage(message, arrivalTime);
        }
    });
    socket.on('listening', () => {
        listening = true;
        socket.setBroadcast(true);
        onListening();
    });
    transport = { socket, networkInterface };
    // The RVLI port on every address, as a board binds it: the clock-sync
    // broadcasts arrive on it, the coordinator replies to it, and each send's
    // subnet broadcast is what picks the interface. RVLA only goes out, so the
    // RVLA port is never bound
    socket.bind(RVLI_PORT);
}
export function getInterfaceAddress() {
    const bindings = networkInterfaces()[getTransport().networkInterface] ?? [];
    const binding = bindings.find(isUsableAddress);
    if (!binding) {
        return undefined;
    }
    return { address: binding.address, netmask: binding.netmask };
}
// Never rejects, so callers can drop the promise
export function send(packet, port) {
    const { socket } = getTransport();
    const interfaceAddress = getInterfaceAddress();
    if (!interfaceAddress) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        socket.send(packet.toBuffer(), port, getBroadcastAddress(interfaceAddress), (err) => {
            if (err) {
                console.error(err);
            }
            resolve();
        });
    });
}
//# sourceMappingURL=transport.js.map