import { AppendBuffer } from "../buffer.js";
import { isClockSynchronized, waitForClockSync } from "../clock.js";
import { ID_REQUEST_TYPE, RVLI_PACKET_TYPE_ID_ASSIGNMENT, RVLI_PORT, RVLI_SIGNATURE, RVLI_VERSION, UNASSIGNED_DEVICE_ID, } from "../config.js";
import { emit } from "../events.js";
import { getAvailableInterfaces } from "../net.js";
import { assertInitialized, getInterfaceAddress, getNetworkInterface, send, } from "../transport.js";
const IDENTITY_LOOP_INTERVAL = 250;
const ID_RETRY_INTERVAL = 1000;
const ID_RETRY_JITTER = 250;
const ID_WARNING_INTERVAL = 10000;
let deviceId;
// Whether connected has been announced and not yet taken back
let connected = false;
let nextIdRequestTime = 0;
let idRequested = false;
let lastIdRequestTime = 0;
let lastIdWarningTime = 0;
export function getDeviceId() {
    assertInitialized();
    return deviceId;
}
// Connected is being able to address the fleet and share its time: a device
// ID, which is only held while the interface has an address, and the first
// clock sync, which lasts
export function isConnected() {
    assertInitialized();
    return deviceId !== undefined && isClockSynchronized();
}
function announceIfConnected() {
    if (!connected && deviceId !== undefined && isClockSynchronized()) {
        connected = true;
        emit('connected');
    }
}
export function startIdentityProtocol() {
    const now = performance.now();
    nextIdRequestTime = now;
    lastIdWarningTime = now;
    void waitForClockSync().then(announceIfConnected);
    runIdentityLoop();
    setInterval(runIdentityLoop, IDENTITY_LOOP_INTERVAL);
}
// A port of the firmware's ProtocolIdentity::loop(), with the interface
// having an IPv4 address standing in for the transport's link state. Only
// whether it has one matters, never which one
function runIdentityLoop() {
    const now = performance.now();
    const interfaceAddress = getInterfaceAddress();
    if (!interfaceAddress) {
        if (deviceId !== undefined) {
            deviceId = undefined;
            lastIdWarningTime = now;
            if (connected) {
                connected = false;
                emit('disconnected');
            }
        }
        nextIdRequestTime = now;
        idRequested = false;
    }
    else if (deviceId === undefined && now >= nextIdRequestTime) {
        if (!idRequested) {
            console.info('Requesting device ID');
            idRequested = true;
        }
        lastIdRequestTime = now;
        sendIdRequest();
        nextIdRequestTime =
            now + ID_RETRY_INTERVAL + Math.random() * ID_RETRY_JITTER;
    }
    if (deviceId === undefined &&
        now - lastIdWarningTime >= ID_WARNING_INTERVAL) {
        lastIdWarningTime = now;
        if (interfaceAddress) {
            console.warn(`No device ID from the coordinator yet. Is ${getNetworkInterface()} ` +
                `(${interfaceAddress.address}) on the fleet's network?`);
        }
        else {
            console.warn(`Waiting for ${getNetworkInterface()} to get an IPv4 address. ` +
                `Available interfaces: ${getAvailableInterfaces().join(', ')}`);
        }
    }
}
function sendIdRequest() {
    const packet = new AppendBuffer();
    packet.appendString(RVLI_SIGNATURE);
    packet.append8(RVLI_VERSION);
    packet.append8(UNASSIGNED_DEVICE_ID);
    packet.append8(RVLI_PACKET_TYPE_ID_ASSIGNMENT);
    packet.append8(0); // Reserved
    packet.append8(ID_REQUEST_TYPE);
    void send(packet, RVLI_PORT);
}
export function handleIdReply(id) {
    if (id === deviceId) {
        return;
    }
    const roundTrip = performance.now() - lastIdRequestTime;
    console.info(`Assigned device ID ${id}, ${roundTrip.toFixed(1)} ms after the request`);
    deviceId = id;
    announceIfConnected();
}
//# sourceMappingURL=identity.js.map