import { initManager, RVLManager } from "./manager.js";
import {} from "./types.js";
export { getDefaultInterface, getAvailableInterfaces } from "./net.js";
export { createAnimationParameters, createEmptyAnimation, createSolidColorAnimation, createColorCycleAnimation, createMovingAnimation, createPulsingAnimation, createRainbowAnimation, } from "./animation.js";
export {} from "./types.js";
export {};
export async function createManager(options) {
    const manager = new RVLManager(options);
    await manager[initManager]();
    return manager;
}
//# sourceMappingURL=index.js.map