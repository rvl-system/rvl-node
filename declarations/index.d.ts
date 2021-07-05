import { RVLManager, IRVLManagerOptions } from './manager';
export * from './animation';
export { LogLevel, IRVLControllerOptions } from './types';
export { getDefaultInterface, getAvailableInterfaces, RVLManager, IRVLManagerOptions } from './manager';
export { RVLController } from './controller';
export declare function createManager(options?: IRVLManagerOptions): Promise<RVLManager>;
