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
export declare function init(ifaceName: string, logLevel: 'error' | 'info' | 'debug', cb: (err?: Error) => void): void;
export declare function start(): void;
export declare function stop(): void;
export declare function setWaveParameters(params: IWaveParameters): void;
