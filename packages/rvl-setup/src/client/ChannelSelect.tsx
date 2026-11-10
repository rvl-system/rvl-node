import { Loader, NativeSelect } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { limitsAtom } from './state.ts';
import { useConfigure } from './useConfigure.ts';

type Props = {
  deviceId: number;
  value: number;
  disabled: boolean;
  description: string | undefined;
};

export function ChannelSelect({
  deviceId,
  value,
  disabled,
  description,
}: Props) {
  const { numChannels } = useAtomValue(limitsAtom);
  const { pending, error, configure } = useConfigure(deviceId);
  const channels = Array.from({ length: numChannels }, (_, channel) =>
    String(channel)
  );
  return (
    <NativeSelect
      label="Channel"
      description={description}
      data={channels}
      value={String(value)}
      disabled={disabled}
      error={error}
      rightSection={pending ? <Loader size="xs" /> : undefined}
      onChange={(event) => {
        void configure({
          property: 'channel',
          value: Number(event.currentTarget.value),
        });
      }}
    />
  );
}
