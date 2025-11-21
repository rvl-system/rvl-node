import { type AnimationLayer, type AnimationParameters } from './types.js';
export declare function createAnimationParameters(animation1?: AnimationLayer, animation2?: AnimationLayer, animation3?: AnimationLayer, animation4?: AnimationLayer): AnimationParameters;
export declare function createEmptyAnimation(): AnimationLayer;
export declare function createSolidColorAnimation(h: number, s: number, a: number): AnimationLayer;
export declare function createColorCycleAnimation(rate: number, a: number): AnimationLayer;
export declare function createWaveAnimation(h: number, s: number, rate: number, spacing: number): AnimationLayer;
export declare function createPulsingAnimation(h: number, s: number, rate: number): AnimationLayer;
export declare function createRainbowAnimation(a: number, rate: number): AnimationLayer;
