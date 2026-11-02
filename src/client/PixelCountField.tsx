import { NumberInput } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { ModalField } from './ModalField.tsx';
import { limitsAtom } from './state.ts';
import { useConfigure } from './useConfigure.ts';

type Props = {
  deviceId: number;
  value: number;
  disabled: boolean;
  description: string | undefined;
};

export function PixelCountField({
  deviceId,
  value,
  disabled,
  description,
}: Props) {
  const { maxPixelCount } = useAtomValue(limitsAtom);
  const { pending, error, configure } = useConfigure(deviceId);
  const isValid = (draft: number | string): draft is number =>
    typeof draft === 'number' && draft >= 1 && draft <= maxPixelCount;
  return (
    <ModalField<number | string>
      label="Pixel count"
      display={String(value)}
      disabled={disabled}
      description={description}
      initial={value}
      canSave={isValid}
      pending={pending}
      error={error}
      save={(draft) =>
        isValid(draft)
          ? configure({ property: 'pixelCount', value: draft })
          : Promise.resolve(false)
      }
    >
      {(draft, setDraft) => (
        <NumberInput
          label="Pixel count"
          description={`1 to ${maxPixelCount}`}
          min={1}
          max={maxPixelCount}
          allowDecimal={false}
          clampBehavior="blur"
          value={draft}
          onChange={setDraft}
          data-autofocus
        />
      )}
    </ModalField>
  );
}
