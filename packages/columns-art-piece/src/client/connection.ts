import { getDefaultStore } from 'jotai';

import {
  type ClientMessage,
  type ServerMessage,
  type Settings,
} from '../common/messages.ts';
import { columnsAtom, hasHelloAtom, settingsAtom } from './state.ts';

const RETRY_DELAY = 250;

const store = getDefaultStore();
let socket: WebSocket | undefined;

function applyMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'hello':
      store.set(columnsAtom, message.columns);
      store.set(settingsAtom, message.settings);
      store.set(hasHelloAtom, true);
      break;
    case 'columns':
      store.set(columnsAtom, message.columns);
      break;
    case 'settings':
      store.set(settingsAtom, message.settings);
      break;
  }
}

export function connect(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const opening = new WebSocket(`${protocol}//${window.location.host}/ws`);
  socket = opening;
  opening.addEventListener('message', (event: MessageEvent<string>) => {
    applyMessage(JSON.parse(event.data) as ServerMessage);
  });
  opening.addEventListener('close', () => {
    setTimeout(connect, RETRY_DELAY);
  });
}

// Dropped while the socket is down: the control falls back to the server's
// value, which hello brings again
export function sendSettings(settings: Partial<Settings>): void {
  if (socket?.readyState !== WebSocket.OPEN) {
    return;
  }
  const message: ClientMessage = { type: 'set', settings };
  socket.send(JSON.stringify(message));
}
