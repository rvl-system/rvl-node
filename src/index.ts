export { init } from './rvl.ts';
export {
  getAnimationClock,
  subtractFrames,
  toAnimationClock,
  toLocalTime,
} from './clock.ts';
export { FRAME_PERIOD, MAX_PIXEL_COUNT } from './config.ts';
export { on } from './events.ts';
export {
  getEarliestStartFrame,
  setAnimationParameters,
  setOff,
} from './protocols/animation.ts';
export {
  configureNode,
  getNodes,
  identifyNode,
} from './protocols/configuration.ts';
export { getDeviceId, isConnected } from './protocols/identity.ts';
export { getNetworkInterface } from './transport.ts';
export { getDefaultInterface, getAvailableInterfaces } from './net.ts';
export {
  createAnimationParameters,
  createEmptyAnimation,
  createSolidColorAnimation,
  createColorCycleAnimation,
  createMovingAnimation,
  createPulsingAnimation,
  createRainbowAnimation,
  createSimpleWaveParameters,
} from './parametric.ts';

export {
  type AnimationColorParameters,
  type AnimationLayer,
  type AnimationParameters,
  type ColorOrder,
  type NodeCapabilities,
  type NodeConfiguration,
  type NodeStatus,
  type SceneOptions,
} from './types.ts';
