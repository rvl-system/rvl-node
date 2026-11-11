import { getDefaultStore } from 'jotai';

import {
  type ClientMessage,
  type ServerMessage,
  type Settings,
} from '../common/messages.ts';
import { columnsAtom, fleetAtom, settingsAtom, socketAtom } from './state.ts';

const RETRY_DELAY = 250;

const store = getDefaultStore();
let socket: WebSocket | undefined;

function applyMessage(message: ServerMessage): void {
  switch (message.type) {
    case 'hello':
      store.set(fleetAtom, message.fleet);
      store.set(columnsAtom, message.columns);
      store.set(settingsAtom, message.settings);
      break;
    case 'fleet':
      store.set(fleetAtom, message.fleet);
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
  store.set(socketAtom, 'connecting');
  opening.addEventListener('open', () => {
    store.set(socketAtom, 'open');
  });
  opening.addEventListener('message', (event: MessageEvent<string>) => {
    applyMessage(JSON.parse(event.data) as ServerMessage);
  });
  opening.addEventListener('close', () => {
    store.set(socketAtom, 'closed');
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
