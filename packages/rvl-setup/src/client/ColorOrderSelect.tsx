import { Loader, NativeSelect } from '@mantine/core';

import {
  COLOR_ORDERS,
  type ColorOrder,
  isColorOrder,
} from '../common/messages.ts';
import { useConfigure } from './useConfigure.ts';

type Props = {
  deviceId: number;
  value: ColorOrder;
  disabled: boolean;
  description: string | undefined;
};

export function ColorOrderSelect({
  deviceId,
  value,
  disabled,
  description,
}: Props) {
  const { pending, error, configure } = useConfigure(deviceId);
  return (
    <NativeSelect
      label="Color order"
      description={description}
      data={[...COLOR_ORDERS]}
      value={value}
      disabled={disabled}
      error={error}
      rightSection={pending ? <Loader size="xs" /> : undefined}
      onChange={(event) => {
        const { value: chosen } = event.currentTarget;
        if (isColorOrder(chosen)) {
          void configure({ property: 'colorOrder', value: chosen });
        }
      }}
    />
  );
}
