/// <reference types="node" />
import { LogLevel, ISendPacketMessage } from './types';
import { IWaveParameters } from './animation';
export declare type SendPacket = (message: ISendPacketMessage) => void;
export declare const initController: unique symbol;
export declare const processPacket: unique symbol;
declare const isInitialized: unique symbol;
declare const options: unique symbol;
declare const rvlWorker: unique symbol;
declare const sendPacket: unique symbol;
export declare class RVLController {
    private [isInitialized];
    private [options];
    private [rvlWorker];
    private [sendPacket];
    constructor(channel: number, logLevel: LogLevel, deviceId: number, send: SendPacket);
    [initController](): Promise<void>;
    [processPacket](packet: Buffer): void;
    setWaveParameters(newWaveParameters: IWaveParameters): void;
    setPowerState(newPowerState: boolean): void;
    setBrightness(newBrightness: number): void;
}
export {};
