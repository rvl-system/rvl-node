import { initManager, RVLManager } from './manager.js';
import { type RVLManagerOptions } from './types.js';

export { getDefaultInterface, getAvailableInterfaces } from './net.js';
export {
  createWaveParameters,
  createEmptyWave,
  createSolidColorWave,
  createColorCycleWave,
  createMovingWave,
  createPulsingWave,
  createRainbowWave,
} from './animation.js';

export async function createManager(options?: RVLManagerOptions) {
  const manager = new RVLManager(options);
  await manager[initManager]();
  return manager;
}
