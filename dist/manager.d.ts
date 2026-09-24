import { EventEmitter } from 'node:events';
import { type AnimationParameters, type RVLManagerOptions } from './types.js';
export declare const initManager: unique symbol;
type RVLManagerEvents = {
    connected: [];
    disconnected: [];
};
export declare class RVLManager extends EventEmitter<RVLManagerEvents> {
    #private;
    get networkInterface(): string;
    get deviceId(): number | undefined;
    get connected(): boolean;
    constructor({ networkInterface }?: RVLManagerOptions);
    [initManager](): Promise<void>;
    setAnimationParameters(channel: number, parameters: AnimationParameters): Promise<void>;
    setOff(channel: number): Promise<void>;
}
export {};
