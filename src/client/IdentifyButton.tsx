import { Button, Stack, Text } from '@mantine/core';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

import { identifyBoard } from './connection.ts';
import { fleetAtom, socketAtom } from './state.ts';

export function IdentifyButton({ deviceId }: { deviceId: number }) {
  const socket = useAtomValue(socketAtom);
  const fleet = useAtomValue(fleetAtom);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const canIdentify = socket === 'open' && fleet?.connected === true;

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
        disabled={!canIdentify}
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
