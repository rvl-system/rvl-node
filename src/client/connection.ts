import { getDefaultStore } from 'jotai';

import {
  type Board,
  type ClientMessage,
  type ServerMessage,
} from '../common/messages.ts';
import { boardFamily, boardIdsAtom, fleetAtom, socketAtom } from './state.ts';

const RETRY_DELAY = 250;

type Settlers = {
  resolve: (board: Board) => void;
  reject: (error: Error) => void;
};

const store = getDefaultStore();
const pending = new Map<number, Settlers>();
let nextRequestId = 1;
let socket: WebSocket | undefined;

function haveSameEntries<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);
}

// Jotai compares by reference and every message arrives as fresh objects,
// so an unchanged board is compared by value to leave its tile alone
function isSameBoard(a: Board, b: Board): boolean {
  const { capabilities: aCapabilities, ...aRest } = a;
  const { capabilities: bCapabilities, ...bRest } = b;
  return (
    haveSameEntries(aRest, bRest) &&
    haveSameEntries(aCapabilities, bCapabilities)
  );
}

function haveSameIds(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function setBoards(boards: Board[]): void {
  const ids = boards.map((board) => board.deviceId);
  for (const id of store.get(boardIdsAtom)) {
    if (!ids.includes(id)) {
      // A drawer open on it then says it has stopped answering
      store.set(boardFamily(id), undefined);
    }
  }
  for (const board of boards) {
    const boardAtom = boardFamily(board.deviceId);
    const current = store.get(boardAtom);
    if (current === undefined || !isSameBoard(current, board)) {
      store.set(boardAtom, board);
    }
  }
  if (!haveSameIds(ids, store.get(boardIdsAtom))) {
    store.set(boardIdsAtom, ids);
  }
}

function settleRequest(
  message: Extract<ServerMessage, { type: 'result' }>
): void {
  const settlers = pending.get(message.requestId);
  if (settlers === undefined) {
    return;
  }
  pending.delete(message.requestId);
  if ('board' in message) {
    settlers.resolve(message.board);
  } else {
    settlers.reject(new Error(message.error));
  }
}

function rejectPending(reason: string): void {
  for (const settlers of pending.values()) {
    settlers.reject(new Error(reason));
  }
  pending.clear();
}

function applyMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'hello':
      store.set(fleetAtom, message.fleet);
      setBoards(message.boards);
      break;
    case 'fleet':
      store.set(fleetAtom, message.fleet);
      break;
    case 'boards':
      setBoards(message.boards);
      break;
    case 'result':
      settleRequest(message);
      break;
  }
}

export function connect(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const opening = new WebSocket(`${protocol}//${window.location.host}/ws`);
  socket = opening;
  store.set(socketAtom, 'connecting');
  opening.addEventListener('open', () => {
    store.set(socketAtom, 'open');
  });
  opening.addEventListener('message', (event: MessageEvent<string>) => {
    applyMessage(JSON.parse(event.data) as ServerMessage);
  });
  opening.addEventListener('close', () => {
    store.set(socketAtom, 'closed');
    rejectPending('Disconnected from rvl-setup');
    setTimeout(connect, RETRY_DELAY);
  });
}

// Every failure is a rejection, the not-connected one included
function request(message: Omit<ClientMessage, 'requestId'>): Promise<Board> {
  return new Promise((resolve, reject) => {
    if (socket === undefined || socket.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected to rvl-setup'));
      return;
    }
    const requestId = nextRequestId;
    nextRequestId += 1;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ ...message, requestId }));
  });
}

export function identifyBoard(deviceId: number): Promise<Board> {
  return request({ type: 'identify', deviceId });
}
