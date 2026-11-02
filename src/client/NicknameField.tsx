import { TextInput } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { ModalField } from './ModalField.tsx';
import { limitsAtom } from './state.ts';
import { useConfigure } from './useConfigure.ts';

type Props = {
  deviceId: number;
  value: string;
  disabled: boolean;
  description: string | undefined;
};

export function NicknameField({
  deviceId,
  value,
  disabled,
  description,
}: Props) {
  const { nicknameLength } = useAtomValue(limitsAtom);
  const { pending, error, configure } = useConfigure(deviceId);
  return (
    <ModalField<string>
      label="Nickname"
      display={value}
      placeholder="unnamed"
      disabled={disabled}
      description={description}
      initial={value}
      canSave={() => true}
      pending={pending}
      error={error}
      save={(draft) => configure({ property: 'nickname', value: draft })}
    >
      {(draft, setDraft) => (
        <TextInput
          label="Nickname"
          description={`Up to ${nicknameLength} characters; empty for none`}
          maxLength={nicknameLength}
          value={draft}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
          }}
          data-autofocus
        />
      )}
    </ModalField>
  );
}
