import { Group, Input, Loader, Slider } from '@mantine/core';
import { useThrottledCallback } from '@mantine/hooks';
import { useRef, useState } from 'react';

import { useConfigure } from './useConfigure.ts';

const SEND_INTERVAL = 250;

type Props = {
  deviceId: number;
  property: 'brightness' | 'statusLedBrightness';
  label: string;
  value: number;
  disabled: boolean;
  description: string | undefined;
};

export function LevelSlider({
  deviceId,
  property,
  label,
  value,
  disabled,
  description,
}: Props) {
  const { pending, error, configure } = useConfigure(deviceId);
  const [draft, setDraft] = useState<number>();
  const [dragging, setDragging] = useState(false);
  const lastSent = useRef<number>(undefined);
  const send = (level: number) => {
    if (level === lastSent.current) {
      return;
    }
    lastSent.current = level;
    void configure({ property, value: level });
  };
  const sendThrottled = useThrottledCallback(send, SEND_INTERVAL);
  const shown = (dragging || pending) && draft !== undefined ? draft : value;
  return (
    <Input.Wrapper
      label={
        <Group gap="xs" component="span">
          {label}
          {pending && <Loader size={12} />}
        </Group>
      }
      description={description}
      error={error}
    >
      <Slider
        min={0}
        max={255}
        value={shown}
        disabled={disabled}
        onChange={(level) => {
          if (!dragging) {
            // A new drag sends its first value even if it was the last sent
            lastSent.current = undefined;
          }
          setDraft(level);
          setDragging(true);
          sendThrottled(level);
        }}
        onChangeEnd={(level) => {
          setDragging(false);
          send(level);
        }}
      />
    </Input.Wrapper>
  );
}
