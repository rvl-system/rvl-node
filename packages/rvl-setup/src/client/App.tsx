import { Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

import { type Fleet } from '../common/messages.ts';
import { BoardDrawer } from './BoardDrawer.tsx';
import { BoardGrid } from './BoardGrid.tsx';
import { FleetStatus } from './FleetStatus.tsx';
import { boardIdsAtom, fleetAtom } from './state.ts';

function Waiting({ message }: { message: string }) {
  return (
    <Group gap="sm">
      <Loader size="sm" />
      <Text c="dimmed">{message}</Text>
    </Group>
  );
}

function renderBoards(
  fleet: Fleet | undefined,
  hasBoards: boolean,
  onOpen: (deviceId: number) => void
) {
  if (fleet === undefined) {
    return <Waiting message="Connecting to rvl-setup" />;
  }
  if (!fleet.connected) {
    return <Waiting message={`Waiting for the fleet on ${fleet.interface}`} />;
  }
  if (!hasBoards) {
    return <Waiting message="No boards have answered yet" />;
  }
  return <BoardGrid onOpen={onOpen} />;
}

export function App() {
  const fleet = useAtomValue(fleetAtom);
  const boardIds = useAtomValue(boardIdsAtom);
  // The ID outlives the open flag, so the title holds through the slide-out
  const [selectedId, setSelectedId] = useState<number>();
  const [opened, { open, close }] = useDisclosure();
  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1}>RVL Setup</Title>
        <FleetStatus />
        {renderBoards(fleet, boardIds.length > 0, (deviceId) => {
          setSelectedId(deviceId);
          open();
        })}
      </Stack>
      {selectedId !== undefined && (
        <BoardDrawer deviceId={selectedId} opened={opened} onClose={close} />
      )}
    </Container>
  );
}
