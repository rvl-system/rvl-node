import { parseArgs } from 'node:util';

import {
  type AnimationLayer,
  type AnimationParameters,
  createAnimationParameters,
  createColorCycleAnimation,
  createMovingAnimation,
  createPulsingAnimation,
  createRainbowAnimation,
  getNetworkInterface,
  init,
  on,
  setAnimationParameters,
  setOff,
} from '../src/index.ts';

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

init({ networkInterface: values.interface });
console.log(`Sending on channel ${channel} over ${getNetworkInterface()}`);
on('connected', () => {
  console.log('Connected');
});
on('disconnected', () => {
  console.log('Disconnected');
});

let slotIndex = 0;
function playNextSlot() {
  const { name, parameters } = slots[slotIndex];
  slotIndex = (slotIndex + 1) % slots.length;
  console.log(`Playing ${name}`);
  void (parameters
    ? setAnimationParameters(channel, parameters)
    : setOff(channel));
}
playNextSlot();
const slotTimer = setInterval(playNextSlot, slotDuration);

// Off can wait behind a pending scene and its fade, and a slot change in that
// wait would replace it
process.on('SIGINT', () => {
  clearInterval(slotTimer);
  console.log(`Turning off channel ${channel}`);
  void setOff(channel).then(() => process.exit());
});
