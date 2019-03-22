/// <reference types="node" />
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { IWaveParameters } from './bridge';
export { IWave, IWaveChannel, IWaveParameters } from './bridge';
export declare const MAX_NUM_WAVES = 4;
export interface IRVLOptions {
    networkInterface: string;
    port?: number;
    mode?: 'controller' | 'receiver';
    logLevel?: 'error' | 'info' | 'debug';
}
interface IEvents {
    initialized: void;
    waveParametersUpdated: IWaveParameters;
}
declare const RVL_base: new () => StrictEventEmitter<EventEmitter, IEvents, IEvents, "addEventListener" | "removeEventListener", "on" | "addListener" | "removeListener" | "once" | "emit">;
export declare class RVL extends RVL_base {
    private _isInitialized;
    private _waveParameters;
    readonly waveParameters: IWaveParameters;
    constructor({ networkInterface, port, mode, logLevel }: IRVLOptions);
    start(): void;
    stop(): void;
    setWaveParameters({ waves, timePeriod, distancePeriod }: IWaveParameters): void;
    getAnimationTime(): number;
}
