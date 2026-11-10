import { NumberInput } from '@mantine/core';

import { ModalField } from './ModalField.tsx';
import { useConfigure } from './useConfigure.ts';

type Props = {
  deviceId: number;
  property: 'pixelCount' | 'currentLimit';
  label: string;
  max: number;
  unit?: string;
  value: number;
  disabled: boolean;
  description: string | undefined;
};

export function NumberField({
  deviceId,
  property,
  label,
  max,
  unit,
  value,
  disabled,
  description,
}: Props) {
  const { pending, error, configure } = useConfigure(deviceId);
  const formatWithUnit = (count: number) =>
    unit === undefined ? String(count) : `${count} ${unit}`;
  const isValid = (draft: number | string): draft is number =>
    typeof draft === 'number' && draft >= 1 && draft <= max;
  return (
    <ModalField<number | string>
      label={label}
      display={formatWithUnit(value)}
      disabled={disabled}
      description={description}
      initial={value}
      canSave={isValid}
      pending={pending}
      error={error}
      save={(draft) =>
        isValid(draft)
          ? configure({ property, value: draft })
          : Promise.resolve(false)
      }
    >
      {(draft, setDraft) => (
        <NumberInput
          label={label}
          description={`1 to ${formatWithUnit(max)}`}
          suffix={unit === undefined ? undefined : ` ${unit}`}
          min={1}
          max={max}
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
