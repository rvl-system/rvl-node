export { init } from './rvl.ts';
export {
  MAX_CURRENT_LIMIT,
  MAX_PIXEL_COUNT,
  MIN_FADE_FRAMES,
  NICKNAME_LENGTH,
  NUM_CHANNELS,
} from './config.ts';
export { on } from './events.ts';
export { createEmptyAnimation } from './parametric.ts';
export { setAnimationParameters } from './protocols/animation.ts';
export {
  configureNode,
  getNodes,
  identifyNode,
} from './protocols/configuration.ts';
export { getDeviceId, isConnected } from './protocols/identity.ts';
export { getNetworkInterface } from './transport.ts';
export { getDefaultInterface, getAvailableInterfaces } from './net.ts';

export {
  type AnimationLayer,
  type AnimationParameters,
  type NodeStatus,
} from './types.ts';
