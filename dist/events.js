import { EventEmitter } from 'node:events';
// The package's events. The modules emit through emit(), and consumers
// subscribe through on(), so they can't emit
const events = new EventEmitter();
export function on(event, listener) {
    events.on(event, listener);
}
export function emit(event, ...args) {
    events.emit(event, ...args);
}
//# sourceMappingURL=events.js.map