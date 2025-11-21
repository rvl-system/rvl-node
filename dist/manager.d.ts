import { type AnimationParameters, type RVLManagerOptions } from './types.js';
export declare const initManager: unique symbol;
export declare class RVLManager {
    #private;
    get networkInterface(): string;
    get address(): string;
    get port(): number;
    get deviceId(): number;
    constructor({ networkInterface, port, }?: RVLManagerOptions);
    [initManager](): Promise<void>;
    setAnimationParameters(channel: number, parameters: AnimationParameters): void;
    setPowerState(channel: number, newPowerState: boolean): void;
}
