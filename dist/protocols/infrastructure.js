import { ID_REPLY_TYPE, NUM_DEVICE_IDS, RVLI_PACKET_TYPE_ID_ASSIGNMENT, RVLI_SIGNATURE, RVLI_VERSION, } from "../config.js";
// Reads one RVLI datagram. Returns undefined for anything to drop
export function decodeInfrastructurePacket(message) {
    if (message.length < 10 ||
        message.toString('latin1', 0, 4) !== RVLI_SIGNATURE ||
        message[4] !== RVLI_VERSION ||
        message[5] >= NUM_DEVICE_IDS ||
        message[6] !== RVLI_PACKET_TYPE_ID_ASSIGNMENT ||
        message[8] !== ID_REPLY_TYPE) {
        return undefined;
    }
    const deviceId = message[9];
    if (deviceId >= NUM_DEVICE_IDS) {
        return undefined;
    }
    return { type: 'idReply', deviceId };
}
//# sourceMappingURL=infrastructure.js.map