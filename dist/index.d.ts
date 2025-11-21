import { RVLManager } from './manager.js';
import { type RVLManagerOptions } from './types.js';
export { getDefaultInterface, getAvailableInterfaces } from './net.js';
export { createAnimationParameters, createEmptyAnimation, createSolidColorAnimation, createColorCycleAnimation, createMovingAnimation, createPulsingAnimation, createRainbowAnimation, } from './animation.js';
export { type AnimationColorParameters, type AnimationLayer, type AnimationParameters, } from './types.js';
export { type RVLManager };
export declare function createManager(options?: RVLManagerOptions): Promise<RVLManager>;
