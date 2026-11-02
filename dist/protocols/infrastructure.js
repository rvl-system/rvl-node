import {} from "../buffer.js";
import { COLOR_ORDERS, EVERY_DEVICE_ID, ID_REPLY_TYPE, NUM_DEVICE_IDS, PROPERTIES, RVLI_PACKET_TYPE_CLOCK_SYNC, RVLI_PACKET_TYPE_ID_ASSIGNMENT, RVLI_PACKET_TYPE_STATUS, RVLI_SIGNATURE, RVLI_VERSION, } from "../config.js";
import {} from "../types.js";
// These mirror src/rvl/protocols/clock_sync in rvl
// (github.com/rvl-system/rvl)
const CLOCK_SYNC_PACKET_TYPE_REFERENCE_BROADCAST = 1;
const CLOCK_SYNC_PACKET_TYPE_OBSERVATION = 2;
// The header plus each type's payload, which the boards hold their senders to
// as well: a wrong length is a bug in a fleet whose senders are all its own
const HEADER_LENGTH = 8;
const ID_REPLY_PACKET_LENGTH = HEADER_LENGTH + 2;
const REFERENCE_PACKET_LENGTH = HEADER_LENGTH + 6;
const OBSERVATION_PACKET_LENGTH = HEADER_LENGTH + 8;
const STATUS_PACKET_LENGTH = HEADER_LENGTH + 23;
// Signature, version, source, packet type and destination, as every RVLI
// writer writes them
export function writeInfrastructureHeader(packet, source, packetType, destination) {
    packet.appendString(RVLI_SIGNATURE);
    packet.append8(RVLI_VERSION);
    packet.append8(source);
    packet.append8(packetType);
    packet.append8(destination);
}
function decodeCapabilities(bits) {
    const has = (property) => (bits & (1 << PROPERTIES.indexOf(property))) !== 0;
    return {
        channel: has('channel'),
        brightness: has('brightness'),
        pixelCount: has('pixelCount'),
        colorOrder: has('colorOrder'),
        statusLedBrightness: has('statusLedBrightness'),
        nickname: has('nickname'),
    };
}
function decodeStatus(message, source) {
    const orderIndex = message[13];
    if (orderIndex >= COLOR_ORDERS.length) {
        return undefined;
    }
    const colorOrder = COLOR_ORDERS[orderIndex];
    const nickname = message.toString('latin1', 15, 31);
    const nicknameEnd = nickname.indexOf('\0');
    return {
        deviceId: source,
        capabilities: decodeCapabilities(message[8]),
        channel: message[9],
        brightness: message[10],
        pixelCount: message.readUInt16BE(11),
        colorOrder,
        statusLedBrightness: message[14],
        nickname: nicknameEnd < 0 ? nickname : nickname.slice(0, nicknameEnd),
    };
}
// Reads one RVLI datagram. Returns undefined for anything to drop: another
// version, a source that can't be a node or is this one, a destination that is
// neither every node nor this one, an unknown type, or a packet of the wrong
// length for its type
export function decodeInfrastructurePacket(message, ownId) {
    if (message.length < HEADER_LENGTH ||
        message.toString('latin1', 0, 4) !== RVLI_SIGNATURE ||
        message[4] !== RVLI_VERSION) {
        return undefined;
    }
    const source = message[5];
    if (source >= NUM_DEVICE_IDS || source === ownId) {
        return undefined;
    }
    // Before an ID is assigned, only what is for every node, the ID reply among
    // it
    const destination = message[7];
    if (destination !== EVERY_DEVICE_ID && destination !== ownId) {
        return undefined;
    }
    switch (message[6]) {
        case RVLI_PACKET_TYPE_ID_ASSIGNMENT: {
            // A request, which this node sends rather than receives, has no ID byte
            if (message[8] !== ID_REPLY_TYPE ||
                message.length !== ID_REPLY_PACKET_LENGTH) {
                return undefined;
            }
            const deviceId = message[9];
            if (deviceId >= NUM_DEVICE_IDS) {
                return undefined;
            }
            return { type: 'idReply', source, deviceId };
        }
        case RVLI_PACKET_TYPE_CLOCK_SYNC: {
            switch (message[8]) {
                case CLOCK_SYNC_PACKET_TYPE_REFERENCE_BROADCAST:
                    if (message.length !== REFERENCE_PACKET_LENGTH) {
                        return undefined;
                    }
                    return {
                        type: 'reference',
                        source,
                        id: message.readUInt16BE(9),
                        startOfSet: message[12] === 1,
                    };
                case CLOCK_SYNC_PACKET_TYPE_OBSERVATION:
                    if (message.length !== OBSERVATION_PACKET_LENGTH) {
                        return undefined;
                    }
                    return {
                        type: 'observation',
                        source,
                        id: message.readUInt16BE(9),
                        observedTime: message.readUInt32BE(12),
                    };
                default:
                    return undefined;
            }
        }
        case RVLI_PACKET_TYPE_STATUS: {
            if (message.length !== STATUS_PACKET_LENGTH) {
                return undefined;
            }
            const status = decodeStatus(message, source);
            return status && { type: 'status', source, status };
        }
        // The three requests are only ever this node's own
        default:
            return undefined;
    }
}
//# sourceMappingURL=infrastructure.js.map