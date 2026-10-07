// RVLI packets as the coordinator and the boards send them, and RVLA packets
// as a receiver reads them, spelled out byte by byte rather than through the
// library's writers, so a test can't agree with a wrong writer

const COORDINATOR = 100;
export const FIRST_BOARD = 20;

export const RVLI_PORT = 4979;
export const RVLA_PORT = 4978;

function rvli(source: number, packetType: number, payload: number[]): Buffer {
  return Buffer.from([
    0x52,
    0x56,
    0x4c,
    0x49,
    1,
    source,
    packetType,
    0,
    ...payload,
  ]);
}

export function buildIdReply(deviceId: number, source = COORDINATOR): Buffer {
  return rvli(source, 1, [2, deviceId]);
}

export function buildReference(
  id: number,
  startOfSet: boolean,
  source = COORDINATOR
): Buffer {
  return rvli(source, 2, [1, id >> 8, id & 0xff, 0, startOfSet ? 1 : 0, 0]);
}

export function buildObservation(
  source: number,
  id: number,
  observedTime: number
): Buffer {
  const clock = Buffer.alloc(4);
  clock.writeUInt32BE(observedTime >>> 0);
  return rvli(source, 2, [2, id >> 8, id & 0xff, 0, ...clock]);
}

export type SentScene = {
  source: number;
  channel: number;
  type: 'off' | 'parametric';
  start: number;
  fade: number;
  settings: Buffer | undefined;
};

// Checks the header a receiver checks, then reads the scene prefix and the
// settings for parametric
export function readScene(bytes: Buffer): SentScene {
  if (bytes.toString('latin1', 0, 4) !== 'RVLA' || bytes[4] !== 2) {
    throw new Error(`Not an RVLA version 2 packet: ${bytes.toString('hex')}`);
  }
  const source = bytes[5];
  const packetType = bytes[6];
  const channel = bytes[7];
  const start = bytes.readUInt32BE(9);
  const fade = bytes[14];
  if (packetType === 1 && bytes.length === 15) {
    return { source, channel, type: 'off', start, fade, settings: undefined };
  }
  if (packetType === 4 && bytes.length === 97) {
    return {
      source,
      channel,
      type: 'parametric',
      start,
      fade,
      settings: bytes.subarray(15),
    };
  }
  throw new Error(
    `RVLA packet type ${packetType} of ${bytes.length} bytes: ${bytes.toString('hex')}`
  );
}
