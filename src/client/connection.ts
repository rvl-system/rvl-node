import { useSyncExternalStore } from 'react';

import {
  type Board,
  type Fleet,
  type ServerMessage,
} from '../common/messages.ts';

export type AppState = {
  socket: 'connecting' | 'open' | 'closed';
  fleet: Fleet | undefined;
  boards: Board[];
};

const RETRY_DELAY = 250;

let state: AppState = { socket: 'connecting', fleet: undefined, boards: [] };
const listeners = new Set<() => void>();

function setState(changes: Partial<AppState>): void {
  state = { ...state, ...changes };
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function applyMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'hello':
      setState({ fleet: message.fleet, boards: message.boards });
      break;
    case 'fleet':
      setState({ fleet: message.fleet });
      break;
    case 'boards':
      setState({ boards: message.boards });
      break;
  }
}

export function connect(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
  setState({ socket: 'connecting' });
  socket.addEventListener('open', () => {
    setState({ socket: 'open' });
  });
  socket.addEventListener('message', (event: MessageEvent<string>) => {
    applyMessage(JSON.parse(event.data) as ServerMessage);
  });
  socket.addEventListener('close', () => {
    setState({ socket: 'closed' });
    setTimeout(connect, RETRY_DELAY);
  });
}
