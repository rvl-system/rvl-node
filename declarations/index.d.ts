/// <reference types="node" />
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import { IWaveParameters } from './types';
export * from './types';
export * from './animation';
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
    powerStateUpdated: boolean;
    brightnessUpdated: number;
}
declare const RVL_base: new () => StrictEventEmitter<EventEmitter, IEvents, IEvents, "addEventListener" | "removeEventListener", "on" | "addListener" | "removeListener" | "once" | "emit">;
export declare class RVL extends RVL_base {
    private _isInitialized;
    private _waveParameters;
    private _mode;
    private _brightness;
    private _powerState;
    readonly waveParameters: IWaveParameters;
    readonly mode: "controller" | "receiver";
    readonly animationTime: number;
    readonly powerState: boolean;
    readonly brightness: number;
    constructor({ networkInterface, port, mode, logLevel, channel, enableClockSync }: IRVLOptions);
    start(): void;
    stop(): void;
    setWaveParameters({ waves, timePeriod, distancePeriod }: IWaveParameters): void;
    setPowerState(newPowerState: boolean): void;
    setBrightness(newBrightness: number): void;
}
