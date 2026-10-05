import { type AnimationParameters } from '../types.ts';
export declare function setAnimationParameters(channel: number, parameters: AnimationParameters): Promise<void>;
export declare function setOff(channel: number): Promise<void>;
export declare function startAnimationProtocol(): void;
