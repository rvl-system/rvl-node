import { type NodeStatus } from 'rvl-node';
import { afterEach, beforeEach, expect, test } from 'vitest';

import {
  type ConfigureFields,
  type Fleet,
  type Limits,
} from '../src/common/messages.ts';
import {
  answering,
  board,
  type Client,
  silent,
  startTestServer,
} from './harness.ts';

type TestServer = Awaited<ReturnType<typeof startTestServer>>;

const LIMITS: Limits = {
  maxPixelCount: 300,
  numChannels: 8,
  nicknameLength: 16,
  maxCurrentLimit: 65535,
};
const OFFLINE: Fleet = { interface: 'en0', connected: false };
const ONLINE: Fleet = { interface: 'en0', connected: true, deviceId: 4 };

let fleet: TestServer;

beforeEach(async () => {
  fleet = await startTestServer();
});

afterEach(() => fleet.stop());

// A client on a joined fleet with boards 2 and 3 listed, its frames consumed
async function connectListed(): Promise<Client> {
  const client = await fleet.connect();
  await client.next();
  await fleet.join(4);
  await client.next();
  await fleet.answer(fleet.calls('getNodes')[0], [board(2), board(3)]);
  await client.next();
  return client;
}

function configureBrightness(
  client: Client,
  requestId: number,
  value: number,
  deviceId = 2
): void {
  client.send({
    type: 'configure',
    requestId,
    deviceId,
    property: 'brightness',
    value,
  });
}

test('a client gets hello with the fleet, no boards and the limits', async () => {
  const client = await fleet.connect();
  expect(await client.next()).toEqual({
    type: 'hello',
    fleet: OFFLINE,
    boards: [],
    limits: LIMITS,
  });
  expect(fleet.calls('getNodes')).toHaveLength(0);
});

test('joining the fleet tells every client and lists the boards at once', async () => {
  const client = await fleet.connect();
  await client.next();
  await fleet.join(4);
  expect(await client.next()).toEqual({ type: 'fleet', fleet: ONLINE });
  const [listing] = fleet.calls('getNodes');
  await fleet.answer(listing, [board(3), board(2, { nickname: 'Mini 1' })]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [answering(board(2, { nickname: 'Mini 1' })), answering(board(3))],
  });
});

test('a client connecting after the join gets the roster in hello', async () => {
  await connectListed();
  const second = await fleet.connect();
  expect(await second.next()).toEqual({
    type: 'hello',
    fleet: ONLINE,
    boards: [answering(board(2)), answering(board(3))],
    limits: LIMITS,
  });
});

test('nothing is listed while no client is connected', async () => {
  const client = await fleet.connect();
  await client.next();
  await client.close();
  await fleet.flush();
  await fleet.join(4);
  expect(fleet.calls('getNodes')).toHaveLength(0);
  const again = await fleet.connect();
  await again.next();
  expect(fleet.calls('getNodes')).toHaveLength(1);
});

test('boards are listed every 5 s, dropped after three misses and taken back', async () => {
  const client = await connectListed();
  await fleet.advance(5000);
  expect(fleet.calls('getNodes')).toHaveLength(2);
  await fleet.answer(fleet.calls('getNodes')[1], [board(3)]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [silent(board(2)), answering(board(3))],
  });
  await fleet.advance(5000);
  await fleet.answer(fleet.calls('getNodes')[2], [board(3)]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [silent(board(2)), answering(board(3))],
  });
  await fleet.advance(5000);
  await fleet.answer(fleet.calls('getNodes')[3], [board(3)]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [answering(board(3))],
  });
  await fleet.advance(5000);
  await fleet.answer(fleet.calls('getNodes')[4], [board(2), board(3)]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [answering(board(2)), answering(board(3))],
  });
});

test('leaving the fleet stops the listing and rejoining resumes it', async () => {
  const client = await connectListed();
  await fleet.leave();
  expect(await client.next()).toEqual({ type: 'fleet', fleet: OFFLINE });
  await fleet.advance(5000);
  expect(fleet.calls('getNodes')).toHaveLength(1);
  await fleet.join(4);
  expect(await client.next()).toEqual({ type: 'fleet', fleet: ONLINE });
  expect(fleet.calls('getNodes')).toHaveLength(2);
});

test('an rvl-node error reaches onFleetError', () => {
  const error = new Error('Another RVL Node holds port 4979');
  fleet.fail(error);
  expect(fleet.onFleetError).toHaveBeenCalledWith(error);
});

test('identify asks rvl-node and answers the requester after the roster', async () => {
  const client = await connectListed();
  const second = await fleet.connect();
  await second.next();
  client.send({ type: 'identify', requestId: 7, deviceId: 2 });
  await fleet.flush();
  const [call] = fleet.calls('identifyNode');
  expect(call.args).toEqual([2]);
  const renamed = board(2, { nickname: 'Mini 1' });
  await fleet.answer(call, renamed);
  const roster = [answering(renamed), answering(board(3))];
  expect(await client.next()).toEqual({ type: 'boards', boards: roster });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 7,
    board: answering(renamed),
  });
  expect(await second.next()).toEqual({ type: 'boards', boards: roster });
  expect(second.frames).toHaveLength(0);
  const third = await fleet.connect();
  expect(await third.next()).toMatchObject({ type: 'hello', boards: roster });
});

test('an identify the board does not answer is an error result alone', async () => {
  const client = await connectListed();
  client.send({ type: 'identify', requestId: 8, deviceId: 2 });
  await fleet.flush();
  await fleet.reject(fleet.calls('identifyNode')[0], 'Node 2 did not answer');
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 8,
    error: 'Node 2 did not answer',
  });
  expect(client.frames).toHaveLength(0);
});

const CONFIGURES: { fields: ConfigureFields; applied: Partial<NodeStatus> }[] =
  [
    { fields: { property: 'channel', value: 1 }, applied: { channel: 1 } },
    {
      fields: { property: 'brightness', value: 128 },
      applied: { brightness: 128 },
    },
    {
      fields: { property: 'pixelCount', value: 24 },
      applied: { pixelCount: 24 },
    },
    {
      fields: { property: 'colorOrder', value: 'BGR' },
      applied: { colorOrder: 'BGR' },
    },
    {
      fields: { property: 'statusLedBrightness', value: 10 },
      applied: { statusLedBrightness: 10 },
    },
    {
      fields: { property: 'nickname', value: 'left bar' },
      applied: { nickname: 'left bar' },
    },
    {
      fields: { property: 'currentLimit', value: 3000 },
      applied: { currentLimit: 3000 },
    },
  ];

test.each(CONFIGURES)(
  'configure $fields.property sends the typed value and answers with the board',
  async ({ fields, applied }) => {
    const client = await connectListed();
    client.send({ type: 'configure', requestId: 9, deviceId: 2, ...fields });
    await fleet.flush();
    const [call] = fleet.calls('configureNode');
    expect(call.args).toEqual([2, fields.property, fields.value]);
    await fleet.answer(call, board(2, applied));
    expect(await client.next()).toMatchObject({ type: 'boards' });
    expect(await client.next()).toEqual({
      type: 'result',
      requestId: 9,
      board: answering(board(2, applied)),
    });
  }
);

const MALFORMED: [string, string][] = [
  ['text that is not JSON', 'not json'],
  ['an array', '[]'],
  ['a missing requestId', JSON.stringify({ type: 'identify', deviceId: 2 })],
  [
    'a fractional deviceId',
    JSON.stringify({ type: 'identify', requestId: 1, deviceId: 2.5 }),
  ],
  [
    'an unknown type',
    JSON.stringify({ type: 'reboot', requestId: 1, deviceId: 2 }),
  ],
  [
    'an unknown property',
    JSON.stringify({
      type: 'configure',
      requestId: 1,
      deviceId: 2,
      property: 'mode',
      value: 1,
    }),
  ],
  [
    'a string channel',
    JSON.stringify({
      type: 'configure',
      requestId: 1,
      deviceId: 2,
      property: 'channel',
      value: '1',
    }),
  ],
  [
    'a color order that is not one',
    JSON.stringify({
      type: 'configure',
      requestId: 1,
      deviceId: 2,
      property: 'colorOrder',
      value: 'XYZ',
    }),
  ],
  [
    'a numeric nickname',
    JSON.stringify({
      type: 'configure',
      requestId: 1,
      deviceId: 2,
      property: 'nickname',
      value: 5,
    }),
  ],
];

async function expectIgnored(client: Client): Promise<void> {
  await fleet.flush();
  expect(fleet.calls('configureNode')).toHaveLength(0);
  expect(fleet.calls('identifyNode')).toHaveLength(0);
  expect(fleet.warn).toHaveBeenCalledTimes(1);
  client.send({ type: 'identify', requestId: 2, deviceId: 2 });
  await fleet.flush();
  expect(fleet.calls('identifyNode')).toHaveLength(1);
}

test.each(MALFORMED)(
  '%s is ignored and the socket stays usable',
  async (_, text) => {
    const client = await connectListed();
    client.sendText(text);
    await expectIgnored(client);
  }
);

test('a binary frame is ignored and the socket stays usable', async () => {
  const client = await connectListed();
  client.sendBinary();
  await expectIgnored(client);
});

test('a second value for a property in flight waits and goes out after the first', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  configureBrightness(client, 2, 20);
  await fleet.flush();
  expect(fleet.calls('configureNode')).toHaveLength(1);
  await fleet.answer(
    fleet.calls('configureNode')[0],
    board(2, { brightness: 10 })
  );
  expect(await client.next()).toMatchObject({ type: 'boards' });
  expect(client.frames).toHaveLength(0);
  const [, second] = fleet.calls('configureNode');
  expect(second.args).toEqual([2, 'brightness', 20]);
  await fleet.answer(second, board(2, { brightness: 20 }));
  expect(await client.next()).toMatchObject({ type: 'boards' });
  const final = answering(board(2, { brightness: 20 }));
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 1,
    board: final,
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 2,
    board: final,
  });
});

test('of three values in a row the middle one is never sent', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  configureBrightness(client, 2, 20);
  configureBrightness(client, 3, 30);
  await fleet.flush();
  await fleet.answer(
    fleet.calls('configureNode')[0],
    board(2, { brightness: 10 })
  );
  await client.next();
  const [, second] = fleet.calls('configureNode');
  expect(second.args).toEqual([2, 'brightness', 30]);
  await fleet.answer(second, board(2, { brightness: 30 }));
  await client.next();
  const final = answering(board(2, { brightness: 30 }));
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 1,
    board: final,
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 2,
    board: final,
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 3,
    board: final,
  });
  expect(fleet.calls('configureNode')).toHaveLength(2);
});

test('different properties, or different boards, go out at once', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  client.send({
    type: 'configure',
    requestId: 2,
    deviceId: 2,
    property: 'nickname',
    value: 'left bar',
  });
  configureBrightness(client, 3, 10, 3);
  await fleet.flush();
  expect(fleet.calls('configureNode').map((call) => call.args)).toEqual([
    [2, 'brightness', 10],
    [2, 'nickname', 'left bar'],
    [3, 'brightness', 10],
  ]);
});

test('a failed send still sends the waiting value, and both get its outcome', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  configureBrightness(client, 2, 20);
  await fleet.flush();
  await fleet.reject(fleet.calls('configureNode')[0], 'Node 2 did not answer');
  expect(client.frames).toHaveLength(0);
  const [, second] = fleet.calls('configureNode');
  expect(second.args).toEqual([2, 'brightness', 20]);
  await fleet.answer(second, board(2, { brightness: 20 }));
  await client.next();
  const final = answering(board(2, { brightness: 20 }));
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 1,
    board: final,
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 2,
    board: final,
  });
});

test('when the last send fails every waiter gets the error', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  configureBrightness(client, 2, 20);
  await fleet.flush();
  await fleet.answer(
    fleet.calls('configureNode')[0],
    board(2, { brightness: 10 })
  );
  await client.next();
  await fleet.reject(fleet.calls('configureNode')[1], 'Node 2 did not answer');
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 1,
    error: 'Node 2 did not answer',
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 2,
    error: 'Node 2 did not answer',
  });
});

test('after a slot drains the next value goes out at once', async () => {
  const client = await connectListed();
  configureBrightness(client, 1, 10);
  await fleet.flush();
  await fleet.answer(
    fleet.calls('configureNode')[0],
    board(2, { brightness: 10 })
  );
  await client.next();
  await client.next();
  configureBrightness(client, 2, 20);
  await fleet.flush();
  expect(fleet.calls('configureNode')).toHaveLength(2);
  expect(fleet.calls('configureNode')[1].args).toEqual([2, 'brightness', 20]);
});
