import { type AnimationParameters, type SceneOptions } from '../types.ts';
export declare function setAnimationParameters(channel: number, parameters: AnimationParameters, options?: SceneOptions): Promise<void>;
export declare function setOff(channel: number, options?: SceneOptions): Promise<void>;
export declare function getEarliestStartFrame(channel: number): number | undefined;
export declare function startAnimationProtocol(): void;
