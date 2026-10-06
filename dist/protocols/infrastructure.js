import { ID_REPLY_TYPE, NUM_DEVICE_IDS, RVLI_PACKET_TYPE_CLOCK_SYNC, RVLI_PACKET_TYPE_ID_ASSIGNMENT, RVLI_SIGNATURE, RVLI_VERSION, } from "../config.js";
// These mirror src/rvl/protocols/clock_sync in rvl
// (github.com/rvl-system/rvl)
const CLOCK_SYNC_PACKET_TYPE_REFERENCE_BROADCAST = 1;
const CLOCK_SYNC_PACKET_TYPE_OBSERVATION = 2;
const HEADER_LENGTH = 8;
// Reads one RVLI datagram. Returns undefined for anything to drop: another
// version, a source that can't be a node or is this one, an unknown type, or a
// packet too short for its type
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
    switch (message[6]) {
        case RVLI_PACKET_TYPE_ID_ASSIGNMENT: {
            if (message.length < 10 || message[8] !== ID_REPLY_TYPE) {
                return undefined;
            }
            const deviceId = message[9];
            if (deviceId >= NUM_DEVICE_IDS) {
                return undefined;
            }
            return { type: 'idReply', source, deviceId };
        }
        case RVLI_PACKET_TYPE_CLOCK_SYNC: {
            if (message.length < 12) {
                return undefined;
            }
            const id = message.readUInt16BE(9);
            switch (message[8]) {
                case CLOCK_SYNC_PACKET_TYPE_REFERENCE_BROADCAST:
                    if (message.length < 14) {
                        return undefined;
                    }
                    return {
                        type: 'reference',
                        source,
                        id,
                        startOfSet: message[12] === 1,
                    };
                case CLOCK_SYNC_PACKET_TYPE_OBSERVATION:
                    if (message.length < 16) {
                        return undefined;
                    }
                    return {
                        type: 'observation',
                        source,
                        id,
                        observedTime: message.readUInt32BE(12),
                    };
                default:
                    return undefined;
            }
        }
        default:
            return undefined;
    }
}
//# sourceMappingURL=infrastructure.js.map