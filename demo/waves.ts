import { parseArgs } from 'node:util';

import {
  type AnimationLayer,
  type AnimationParameters,
  createAnimationParameters,
  createColorCycleAnimation,
  createManager,
  createMovingAnimation,
  createPulsingAnimation,
  createRainbowAnimation,
} from '../dist/index.js';

const { values } = parseArgs({
  options: {
    channel: { type: 'string', short: 'c', default: '0' },
    interface: { type: 'string', short: 'i' },
    duration: { type: 'string', short: 'd', default: '10' },
  },
});
const channel = Number(values.channel);
const slotDuration = Number(values.duration) * 1000;
if (!(slotDuration > 0)) {
  throw new Error('--duration must be a positive number of seconds');
}

function reorderKeys({ h, s, v, a }: AnimationLayer): AnimationLayer {
  return { a, v, s, h };
}

const moving = createMovingAnimation(0, 255, 8, 2);

// null means off
const slots: { name: string; parameters: AnimationParameters | null }[] = [
  { name: 'moving', parameters: createAnimationParameters(moving) },
  {
    name: 'moving, keys reordered (no visible change)',
    parameters: createAnimationParameters(reorderKeys(moving)),
  },
  {
    name: 'pulsing',
    parameters: createAnimationParameters(createPulsingAnimation(170, 255, 16)),
  },
  {
    name: 'rainbow',
    parameters: createAnimationParameters(createRainbowAnimation(255, 4)),
  },
  {
    name: 'color cycle',
    parameters: createAnimationParameters(createColorCycleAnimation(4, 255)),
  },
  { name: 'off', parameters: null },
];

const manager = await createManager({ networkInterface: values.interface });
console.log(`Sending on channel ${channel} over ${manager.networkInterface}`);
manager.on('connected', () => {
  console.log('Connected');
});
manager.on('disconnected', () => {
  console.log('Disconnected');
});

let slotIndex = 0;
function playNextSlot() {
  const { name, parameters } = slots[slotIndex];
  slotIndex = (slotIndex + 1) % slots.length;
  console.log(`Playing ${name}`);
  void (parameters
    ? manager.setAnimationParameters(channel, parameters)
    : manager.setOff(channel));
}
playNextSlot();
setInterval(playNextSlot, slotDuration);

process.on('SIGINT', () => {
  console.log(`Turning off channel ${channel}`);
  void manager.setOff(channel).then(() => process.exit());
});
