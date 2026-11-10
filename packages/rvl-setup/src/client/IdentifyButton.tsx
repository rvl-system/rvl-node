import { Button, Stack, Text } from '@mantine/core';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

import { identifyBoard } from './connection.ts';
import { onlineAtom } from './state.ts';

export function IdentifyButton({ deviceId }: { deviceId: number }) {
  const online = useAtomValue(onlineAtom);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function identify(): Promise<void> {
    setPending(true);
    setError(undefined);
    try {
      await identifyBoard(deviceId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap={4}>
      <Button
        variant="default"
        loading={pending}
        disabled={!online}
        onClick={() => {
          void identify();
        }}
      >
        Identify
      </Button>
      {error !== undefined && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
