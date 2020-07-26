import { IWaveParameters } from './animation';
export interface IRVLControllerOptions {
    networkInterface: string;
    channel: number;
    port?: number;
    logLevel?: 'error' | 'info' | 'debug';
}
export interface IMessage {
    type: string;
}
export interface IInitCompleteMessage extends IMessage {
    type: 'initComplete';
}
export interface ISetWaveParametersMessage extends IMessage {
    type: 'setWaveParameters';
    waveParameters: IWaveParameters;
}
export interface ISetBrightnessMessage extends IMessage {
    type: 'setBrightness';
    brightness: number;
}
export interface ISetPowerStateMessage extends IMessage {
    type: 'setPowerState';
    powerState: boolean;
}
