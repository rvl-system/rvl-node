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
export declare function createWaveParameters(wave1?: IWave, wave2?: IWave, wave3?: IWave, wave4?: IWave): IWaveParameters;
export declare function createEmptyWave(): IWave;
export declare function createSolidColorWave(h: number, s: number, a: number): IWave;
export declare function createColorCycleWave(rate: number, a: number): IWave;
export declare function createMovingWave(h: number, s: number, rate: number, spacing: number): IWave;
export declare function createPulsingWave(h: number, s: number, rate: number): IWave;
export declare function createRainbowWave(a: number, rate: number): IWave;
