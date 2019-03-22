export interface IWaveChannel {
    a: number;
    b: number;
    w_t: number;
    w_x: number;
    phi: number;
}
export interface IWave {
    h: IWaveChannel;
    s: IWaveChannel;
    v: IWaveChannel;
    a: IWaveChannel;
}
export interface IWaveParameters {
    timePeriod?: number;
    distancePeriod?: number;
    waves: IWave[];
}
export declare function init(networkInterface: string, port: number, mode: 'controller' | 'receiver', logLevel: 'error' | 'info' | 'debug', cb: (err?: Error) => void): void;
export declare function start(): void;
export declare function stop(): void;
export declare function setWaveParameters(params: IWaveParameters): void;
export declare function getAnimationTime(): number;
export declare function listenForWaveParameterUpdates(cb: (parameters: IWaveParameters) => void): void;
