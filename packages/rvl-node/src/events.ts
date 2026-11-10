import { EventEmitter } from 'node:events';

// The package's events. The modules emit through emit(), and consumers
// subscribe through on(), so they can't emit
const events = new EventEmitter();

export function on(
  event: 'connected' | 'disconnected',
  listener: () => void
): void;
export function on(event: 'error', listener: (error: Error) => void): void;
export function on(
  event: string,
  listener: (() => void) | ((error: Error) => void)
): void {
  events.on(event, listener);
}

export function emit(event: 'connected' | 'disconnected'): void;
export function emit(event: 'error', error: Error): void;
export function emit(event: string, ...args: unknown[]): void {
  events.emit(event, ...args);
}
