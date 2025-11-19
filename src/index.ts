import { initManager, RVLManager } from './manager.js';
import { type RVLManagerOptions } from './types.js';

export async function createManager(options?: RVLManagerOptions) {
  const manager = new RVLManager(options);
  await manager[initManager]();
  return manager;
}
