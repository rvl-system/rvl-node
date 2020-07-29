import { IWaveParameters } from './animation';
export interface IRVLControllerOptions {
    networkInterface: string;
    channel: number;
    port?: number;
    logLevel?: LogLevel;
}
export interface IWorkerOptions {
    channel: number;
    logLevel: LogLevel;
}
export declare enum LogLevel {
    Error = 1,
    Info = 2,
    Debug = 3
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
export interface IReceivePacketMessage extends IMessage {
    type: 'receivedPacket';
    payload: string;
}
export interface ISendPacketMessage extends IMessage {
    type: 'sendPacket';
    payload: string;
}
