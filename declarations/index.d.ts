import { IWaveParameters } from './animation';
export * from './animation';
export interface IRVLControllerOptions {
    networkInterface: string;
    channel: number;
    port?: number;
    logLevel?: 'error' | 'info' | 'debug';
}
declare const isInitialized: unique symbol;
declare const waveParameters: unique symbol;
declare const brightness: unique symbol;
declare const powerState: unique symbol;
export declare class RVLController {
    private [isInitialized];
    private [waveParameters];
    private [brightness];
    private [powerState];
    readonly waveParameters: IWaveParameters;
    readonly animationTime: number;
    readonly powerState: boolean;
    readonly brightness: number;
    constructor({ networkInterface, channel, port, logLevel }: IRVLControllerOptions);
    init(): Promise<void>;
    close(): Promise<void>;
    setWaveParameters(newWaveParameters: IWaveParameters): void;
    setPowerState(newPowerState: boolean): void;
    setBrightness(newBrightness: number): void;
}
