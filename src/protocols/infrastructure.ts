import {
  ID_REPLY_TYPE,
  NUM_DEVICE_IDS,
  RVLI_PACKET_TYPE_CLOCK_SYNC,
  RVLI_PACKET_TYPE_ID_ASSIGNMENT,
  RVLI_SIGNATURE,
  RVLI_VERSION,
} from '../config.ts';

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

type InfrastructureMessage =
  | { type: 'idReply'; source: number; deviceId: number }
  | { type: 'reference'; source: number; id: number; startOfSet: boolean }
  | { type: 'observation'; source: number; id: number; observedTime: number };

// Reads one RVLI datagram. Returns undefined for anything to drop: another
// version, a source that can't be a node or is this one, an unknown type, or a
// packet of the wrong length for its type
export function decodeInfrastructurePacket(
  message: Buffer,
  ownId: number | undefined
): InfrastructureMessage | undefined {
  if (
    message.length < HEADER_LENGTH ||
    message.toString('latin1', 0, 4) !== RVLI_SIGNATURE ||
    message[4] !== RVLI_VERSION
  ) {
    return undefined;
  }
  const source = message[5];
  if (source >= NUM_DEVICE_IDS || source === ownId) {
    return undefined;
  }
  switch (message[6]) {
    case RVLI_PACKET_TYPE_ID_ASSIGNMENT: {
      // A request, which this node sends rather than receives, has no ID byte
      if (
        message[8] !== ID_REPLY_TYPE ||
        message.length !== ID_REPLY_PACKET_LENGTH
      ) {
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
    default:
      return undefined;
  }
}
