import { RVLController } from './controller';
import { IRVLControllerOptions } from './types';
export declare const initManager: unique symbol;
declare const getDefaultInterface: unique symbol;
declare const getAddressForInterface: unique symbol;
declare const socket: unique symbol;
declare const serverAddress: unique symbol;
declare const serverDeviceId: unique symbol;
declare const serverPort: unique symbol;
declare const serverNetworkInterface: unique symbol;
declare const channels: unique symbol;
export interface IRVLManagerOptions {
    networkInterface?: string;
    port?: number;
}
export declare class RVLManager {
    private [socket];
    private [serverNetworkInterface];
    private [serverAddress];
    private [serverPort];
    private [channels];
    private [serverDeviceId];
    get networkInterface(): string;
    get address(): string;
    get port(): number;
    get deviceId(): number;
    constructor({ networkInterface, port }?: IRVLManagerOptions);
    [initManager](): Promise<void>;
    createController(controllerOptions: IRVLControllerOptions): Promise<RVLController>;
    private [getDefaultInterface];
    private [getAddressForInterface];
}
export {};
