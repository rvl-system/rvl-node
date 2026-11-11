import { ColorInput } from '@mantine/core';

import { useSetting } from './useSetting.ts';

type Props = {
  setting: 'firstColor' | 'secondColor';
  label: string;
};

// Only the picker makes a value: typed text would reach onChange half-written
export function ColorSetting({ setting, label }: Props) {
  const [color, changeColor] = useSetting(setting);
  return (
    <ColorInput
      label={label}
      format="hex"
      value={color}
      onChange={changeColor}
      disallowInput
      fixOnBlur={false}
      withEyeDropper={false}
    />
  );
}
