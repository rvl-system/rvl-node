import { Input, Slider } from '@mantine/core';

import { NUMBER_RANGES, type NumberSetting } from '../common/messages.ts';
import { useSetting } from './useSetting.ts';

type Props = {
  setting: NumberSetting;
  formatLabel: (value: number) => string;
};

export function SliderSetting({ setting, formatLabel }: Props) {
  const [value, changeValue] = useSetting(setting);
  const { min, max } = NUMBER_RANGES[setting];
  return (
    <Input.Wrapper label={formatLabel(value)}>
      <Slider
        min={min}
        max={max}
        value={value}
        onChange={changeValue}
        label={null}
      />
    </Input.Wrapper>
  );
}
