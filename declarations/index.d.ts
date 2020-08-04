import { RVLManager, IRVLManagerOptions } from './manager';
export * from './animation';
export { LogLevel } from './types';
export declare function createManager(options?: IRVLManagerOptions): Promise<RVLManager>;
