import { ColorInput, parseColor } from '@mantine/core';

import { type COLOR_SETTINGS } from '../common/messages.ts';
import { useSetting } from './useSetting.ts';

type Props = {
  setting: (typeof COLOR_SETTINGS)[number];
  label: string;
};

// The picker's own hue, saturation and value, not the ones the boards get
function formatHsv(color: string): string {
  const { h, s, v } = parseColor(color);
  return `H ${Math.round(h) % 360}° S ${Math.round(s)}% V ${Math.round(v)}%`;
}

// Only the picker makes a value: typed text would reach onChange half-written
export function ColorSetting({ setting, label }: Props) {
  const [color, changeColor] = useSetting(setting);
  return (
    <ColorInput
      label={`${label}: ${formatHsv(color)}`}
      format="hex"
      value={color}
      onChange={changeColor}
      disallowInput
      fixOnBlur={false}
      withEyeDropper={false}
    />
  );
}
