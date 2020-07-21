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
