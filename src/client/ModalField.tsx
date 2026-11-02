import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPencil } from '@tabler/icons-react';
import { type ReactNode, useState } from 'react';

type Props<Draft> = {
  label: string;
  display: string;
  placeholder?: string;
  disabled: boolean;
  description: string | undefined;
  initial: Draft;
  canSave: (draft: Draft) => boolean;
  pending: boolean;
  error: string | undefined;
  save: (draft: Draft) => Promise<boolean>;
  children: (draft: Draft, setDraft: (draft: Draft) => void) => ReactNode;
};

export function ModalField<Draft>({
  label,
  display,
  placeholder,
  disabled,
  description,
  initial,
  canSave,
  pending,
  error,
  save,
  children,
}: Props<Draft>) {
  const [opened, { open, close }] = useDisclosure();
  const [draft, setDraft] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const title = `Edit ${label.toLowerCase()}`;

  async function submit(): Promise<void> {
    setAttempted(true);
    if (await save(draft)) {
      close();
    }
  }

  return (
    <>
      <TextInput
        label={label}
        description={description}
        value={display}
        placeholder={placeholder}
        readOnly
        disabled={disabled}
        rightSection={
          <ActionIcon
            variant="subtle"
            color="gray"
            disabled={disabled}
            aria-label={title}
            onClick={() => {
              setDraft(initial);
              setAttempted(false);
              open();
            }}
          >
            <IconPencil size={16} />
          </ActionIcon>
        }
      />
      <Modal opened={opened} onClose={close} title={title}>
        <Stack>
          {children(draft, setDraft)}
          {attempted && error !== undefined && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!canSave(draft)}
              onClick={() => {
                void submit();
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
