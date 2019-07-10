/// <reference types="node" />
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { IWaveParameters } from 'rvl-node-types';
export { IWave, IWaveChannel, IWaveParameters } from 'rvl-node-types';
export interface IRVLOptions {
    networkInterface: string;
    channel: number;
    port?: number;
    mode?: 'controller' | 'receiver';
    logLevel?: 'error' | 'info' | 'debug';
    enableClockSync?: boolean;
}
interface IEvents {
    initialized: void;
    waveParametersUpdated: IWaveParameters;
}
declare const RVL_base: new () => StrictEventEmitter<EventEmitter, IEvents, IEvents, "addEventListener" | "removeEventListener", "on" | "addListener" | "removeListener" | "once" | "emit">;
export declare class RVL extends RVL_base {
    private _isInitialized;
    private _waveParameters;
    private _mode;
    readonly waveParameters: IWaveParameters;
    readonly mode: "controller" | "receiver";
    constructor({ networkInterface, port, mode, logLevel, channel, enableClockSync }: IRVLOptions);
    start(): void;
    stop(): void;
    setWaveParameters({ waves, timePeriod, distancePeriod }: IWaveParameters): void;
    getAnimationTime(): number;
}
