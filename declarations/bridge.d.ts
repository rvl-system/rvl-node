/// <reference types="node" />
import { LogLevel } from './types';
import { IWaveParameters } from './animation';
export declare function init(logLevel: LogLevel, channel: number, deviceId: number): Promise<void>;
export declare function setWaveParameters(newWaveParameters: IWaveParameters): void;
export declare function setPowerState(newPowerState: boolean): void;
export declare function setBrightness(newBrightness: number): void;
export declare function receivePacket(packet: Buffer): void;
