import { NativeSelect, Stack, Title } from '@mantine/core';
import { type ComponentType } from 'react';

import { type Animation, ANIMATIONS, isAnimation } from '../common/messages.ts';
import { ColorSetting } from './ColorSetting.tsx';
import { SliderSetting } from './SliderSetting.tsx';
import { useSetting } from './useSetting.ts';

const ANIMATION_LABELS: Record<Animation, string> = {
  shift: 'Shift',
  wave: 'Wave',
  colorCycle: 'Color cycle',
};

const ANIMATION_OPTIONS = ANIMATIONS.map((animation) => ({
  value: animation,
  label: ANIMATION_LABELS[animation],
}));

function ShiftControls() {
  return (
    <>
      <ColorSetting setting="shiftFirstColor" label="First color" />
      <ColorSetting setting="shiftSecondColor" label="Second color" />
      <SliderSetting
        setting="shiftCoverage"
        formatLabel={(coverage) => `Coverage: ${coverage}%`}
      />
      <SliderSetting
        setting="shiftRate"
        formatLabel={(rate) => `Rate: ${rate}`}
      />
    </>
  );
}

function WaveControls() {
  return (
    <>
      <ColorSetting setting="waveColor" label="Wave color" />
      <ColorSetting setting="waveForegroundColor" label="Foreground color" />
      <ColorSetting setting="waveBackgroundColor" label="Background color" />
      <SliderSetting
        setting="waveRate"
        formatLabel={(rate) => `Rate: ${rate}`}
      />
      <SliderSetting
        setting="waveCrests"
        formatLabel={(crests) => `Crests: ${crests}`}
      />
    </>
  );
}

function ColorCycleControls() {
  return (
    <SliderSetting
      setting="colorCycleRate"
      formatLabel={(rate) => `Rate: ${rate}`}
    />
  );
}

const ANIMATION_CONTROLS: Record<Animation, ComponentType> = {
  shift: ShiftControls,
  wave: WaveControls,
  colorCycle: ColorCycleControls,
};

export function BaseAnimationSection() {
  const [animation, changeAnimation] = useSetting('animation');
  const Controls = ANIMATION_CONTROLS[animation];
  return (
    <Stack>
      <NativeSelect
        label="Base animation"
        data={ANIMATION_OPTIONS}
        value={animation}
        onChange={(event) => {
          const { value } = event.currentTarget;
          if (isAnimation(value)) {
            changeAnimation(value);
          }
        }}
      />
      <Title order={2}>{ANIMATION_LABELS[animation]}</Title>
      <Controls />
    </Stack>
  );
}
