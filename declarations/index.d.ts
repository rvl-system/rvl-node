import { IWaveParameters } from './animation';
import { IRVLControllerOptions } from './types';
export * from './animation';
export { IRVLControllerOptions, LogLevel } from './types';
declare const isInitialized: unique symbol;
declare const options: unique symbol;
declare const rvlWorker: unique symbol;
declare const init: unique symbol;
export interface IInitOptions {
    networkInterface?: string;
    port?: number;
}
export declare function createRvl(initOptions?: IInitOptions): {
    createController(controllerOptions: IRVLControllerOptions): Promise<RVLController>;
    readonly networkInterface: string;
    readonly port: number;
    readonly nodeId: string;
};
declare class RVLController {
    private [isInitialized];
    private [options];
    private [rvlWorker];
    constructor({ channel, logLevel }: IRVLControllerOptions);
    [init](): Promise<void>;
    close(): Promise<void>;
    setWaveParameters(newWaveParameters: IWaveParameters): void;
    setPowerState(newPowerState: boolean): void;
    setBrightness(newBrightness: number): void;
}
