import { RVLManager } from './manager.ts';
import { type RVLManagerOptions } from './types.ts';
export { getDefaultInterface, getAvailableInterfaces } from './net.ts';
export { createAnimationParameters, createEmptyAnimation, createSolidColorAnimation, createColorCycleAnimation, createMovingAnimation, createPulsingAnimation, createRainbowAnimation, } from './animation.ts';
export { type AnimationColorParameters, type AnimationLayer, type AnimationParameters, } from './types.ts';
export { type RVLManager };
export declare function createManager(options?: RVLManagerOptions): Promise<RVLManager>;
