import { initManager, RVLManager } from './manager.ts';
import { type RVLManagerOptions } from './types.ts';

export { getDefaultInterface, getAvailableInterfaces } from './net.ts';
export {
  createAnimationParameters,
  createEmptyAnimation,
  createSolidColorAnimation,
  createColorCycleAnimation,
  createMovingAnimation,
  createPulsingAnimation,
  createRainbowAnimation,
} from './animation.ts';

export {
  type AnimationColorParameters,
  type AnimationLayer,
  type AnimationParameters,
} from './types.ts';

export { type RVLManager };

export async function createManager(options?: RVLManagerOptions) {
  const manager = new RVLManager(options);
  await manager[initManager]();
  return manager;
}
