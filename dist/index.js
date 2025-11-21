import { initManager, RVLManager } from './manager.js';
export { getDefaultInterface, getAvailableInterfaces } from './net.js';
export { createAnimationParameters as createWaveParameters, createEmptyAnimation as createEmptyWave, createSolidColorAnimation as createSolidColorWave, createColorCycleAnimation as createColorCycleWave, createWaveAnimation as createMovingWave, createPulsingAnimation as createPulsingWave, createRainbowAnimation as createRainbowWave, } from './animation.js';
export async function createManager(options) {
    const manager = new RVLManager(options);
    await manager[initManager]();
    return manager;
}
//# sourceMappingURL=index.js.map