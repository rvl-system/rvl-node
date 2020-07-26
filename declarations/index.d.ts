import { IWaveParameters } from './animation';
import { IRVLControllerOptions } from './messageTypes';
export * from './animation';
export { IRVLControllerOptions } from './messageTypes';
declare const isInitialized: unique symbol;
declare const options: unique symbol;
declare const rvlWorker: unique symbol;
export declare class RVLController {
    private [isInitialized];
    private [options];
    private [rvlWorker];
    constructor({ networkInterface, channel, port, logLevel }: IRVLControllerOptions);
    init(): Promise<void>;
    close(): Promise<void>;
    setWaveParameters(newWaveParameters: IWaveParameters): void;
    setPowerState(newPowerState: boolean): void;
    setBrightness(newBrightness: number): void;
}
