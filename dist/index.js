import { initManager, RVLManager } from './manager.js';
export { getDefaultInterface, getAvailableInterfaces } from './net.js';
export { createAnimationParameters, createEmptyAnimation, createSolidColorAnimation, createColorCycleAnimation, createMovingAnimation, createPulsingAnimation, createRainbowAnimation, } from './animation.js';
export async function createManager(options) {
    const manager = new RVLManager(options);
    await manager[initManager]();
    return manager;
}
//# sourceMappingURL=index.js.map