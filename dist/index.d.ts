import { RVLManager } from './manager.js';
import { type RVLManagerOptions } from './types.js';
export { getDefaultInterface, getAvailableInterfaces } from './net.js';
export { createAnimationParameters as createWaveParameters, createEmptyAnimation as createEmptyWave, createSolidColorAnimation as createSolidColorWave, createColorCycleAnimation as createColorCycleWave, createWaveAnimation as createMovingWave, createPulsingAnimation as createPulsingWave, createRainbowAnimation as createRainbowWave, } from './animation.js';
export { type AnimationColorParameters, type AnimationLayer, type AnimationParameters, } from './types.js';
export declare function createManager(options?: RVLManagerOptions): Promise<RVLManager>;
