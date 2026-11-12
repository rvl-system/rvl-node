import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { type Board } from '../src/common/messages.ts';
import {
  answering,
  board,
  type Client,
  silent,
  startTestHost,
} from './harness.ts';

type TestHost = Awaited<ReturnType<typeof startTestHost>>;

const onBoardsChange = vi.fn<(boards: Board[]) => void>();
let fleet: TestHost;

beforeEach(async () => {
  onBoardsChange.mockReset();
  fleet = await startTestHost(onBoardsChange);
});

afterEach(() => fleet.stop());

// A client on a joined fleet with boards 2 and 3 listed, its frames consumed
// and the host's calls so far forgotten
async function connectListed(): Promise<Client> {
  await fleet.join(4);
  await fleet.answer(fleet.calls('getNodes')[0], [board(2), board(3)]);
  const client = await fleet.connect();
  await client.next();
  onBoardsChange.mockClear();
  return client;
}

// Vitest fails a run on any uncaught exception, so its own listeners step
// aside while one is expected
async function collectUncaughtExceptions(
  act: () => Promise<void>
): Promise<unknown[]> {
  const thrown: unknown[] = [];
  const collect = (error: unknown) => {
    thrown.push(error);
  };
  const listeners = process.listeners('uncaughtException');
  process.removeAllListeners('uncaughtException');
  process.on('uncaughtException', collect);
  try {
    await act();
  } finally {
    process.off('uncaughtException', collect);
    for (const listener of listeners) {
      process.on('uncaughtException', listener);
    }
  }
  return thrown;
}

test('the boards are listed with no client connected', async () => {
  await fleet.join(4);
  expect(fleet.calls('getNodes')).toHaveLength(1);
  await fleet.advance(5000);
  expect(fleet.calls('getNodes')).toHaveLength(2);
});

test('the last client leaving does not stop the listing', async () => {
  await fleet.join(4);
  const client = await fleet.connect();
  await client.next();
  await client.close();
  await fleet.flush();
  await fleet.advance(5000);
  expect(fleet.calls('getNodes')).toHaveLength(2);
});

test('the host gets the boards after every listing, changed or not', async () => {
  await fleet.join(4);
  expect(onBoardsChange).not.toHaveBeenCalled();
  await fleet.answer(fleet.calls('getNodes')[0], [board(3), board(2)]);
  const roster = [answering(board(2)), answering(board(3))];
  expect(onBoardsChange.mock.calls).toEqual([[roster]]);
  await fleet.advance(5000);
  await fleet.answer(fleet.calls('getNodes')[1], [board(2), board(3)]);
  expect(onBoardsChange.mock.calls).toEqual([[roster], [roster]]);
});

test('the host gets a board that missed a listing, marked as not answering', async () => {
  await connectListed();
  await fleet.advance(5000);
  await fleet.answer(fleet.calls('getNodes')[1], [board(3)]);
  expect(onBoardsChange.mock.calls).toEqual([
    [[silent(board(2)), answering(board(3))]],
  ]);
});

test('the host gets the boards after a board answers a configure or an identify', async () => {
  const client = await connectListed();
  client.send({
    type: 'configure',
    requestId: 1,
    deviceId: 2,
    property: 'pixelCount',
    value: 24,
  });
  await fleet.flush();
  const resized = board(2, { pixelCount: 24 });
  await fleet.answer(fleet.calls('configureNode')[0], resized);
  expect(onBoardsChange.mock.calls).toEqual([
    [[answering(resized), answering(board(3))]],
  ]);
  client.send({ type: 'identify', requestId: 2, deviceId: 3 });
  await fleet.flush();
  const renamed = board(3, { nickname: 'Mini 1' });
  await fleet.answer(fleet.calls('identifyNode')[0], renamed);
  expect(onBoardsChange).toHaveBeenCalledTimes(2);
  expect(onBoardsChange).toHaveBeenLastCalledWith([
    answering(resized),
    answering(renamed),
  ]);
});

test('a throw from the host is uncaught, and the request still succeeds', async () => {
  const client = await connectListed();
  const failure = new Error('The host failed');
  onBoardsChange.mockImplementation(() => {
    throw failure;
  });
  const resized = board(2, { pixelCount: 24 });
  const thrown = await collectUncaughtExceptions(async () => {
    client.send({
      type: 'configure',
      requestId: 1,
      deviceId: 2,
      property: 'pixelCount',
      value: 24,
    });
    await fleet.flush();
    await fleet.answer(fleet.calls('configureNode')[0], resized);
  });
  expect(thrown).toEqual([failure]);
  expect(await client.next()).toEqual({
    type: 'boards',
    boards: [answering(resized), answering(board(3))],
  });
  expect(await client.next()).toEqual({
    type: 'result',
    requestId: 1,
    board: answering(resized),
  });
});
