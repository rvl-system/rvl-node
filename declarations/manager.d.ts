import { RVLController } from './controller';
import { IRVLControllerOptions } from './types';
export declare const initManager: unique symbol;
declare const socket: unique symbol;
declare const serverAddress: unique symbol;
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
    readonly networkInterface: string;
    readonly port: number;
    readonly nodeId: string;
    constructor({ networkInterface, port }?: IRVLManagerOptions);
    [initManager](): Promise<void>;
    createController(controllerOptions: IRVLControllerOptions): Promise<RVLController>;
    private [getDefaultInterface];
    private [getAddressForInterface];
}
export {};
