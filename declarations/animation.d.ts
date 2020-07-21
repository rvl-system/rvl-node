import { IWaveParameters, IWave } from './types';
export interface IPixel {
    r: number;
    g: number;
    b: number;
}
export declare function initRenderer(waveParameters: IWaveParameters, numPixels: number, numWaves?: number): void;
export declare function resetRendererClock(): void;
export declare function getRendererClock(): number;
export declare function renderPixels(): IPixel[];
export declare function createEmptyWave(): IWave;
export declare function createWaveParameters(wave1?: IWave, wave2?: IWave, wave3?: IWave, wave4?: IWave): IWaveParameters;
export declare function createSolidColorWave(h: number, s: number, a: number): IWave;
export declare function createColorCycleWave(rate: number, a: number): IWave;
export declare function createMovingWave(h: number, s: number, rate: number, spacing: number): IWave;
export declare function createPulsingWave(h: number, s: number, rate: number): IWave;
export declare function createRainbowWave(a: number, rate: number): IWave;
