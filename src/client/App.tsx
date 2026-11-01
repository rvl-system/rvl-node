import { Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

import { BoardDrawer } from './BoardDrawer.tsx';
import { BoardGrid } from './BoardGrid.tsx';
import { type AppState, useAppState } from './connection.ts';
import { FleetStatus } from './FleetStatus.tsx';

function Waiting({ message }: { message: string }) {
  return (
    <Group gap="sm">
      <Loader size="sm" />
      <Text c="dimmed">{message}</Text>
    </Group>
  );
}

function renderBoards(
  { fleet, boards }: AppState,
  onOpen: (deviceId: number) => void
) {
  if (fleet === undefined) {
    return <Waiting message="Connecting to rvl-setup" />;
  }
  if (!fleet.connected) {
    return <Waiting message={`Waiting for the fleet on ${fleet.interface}`} />;
  }
  if (boards.length === 0) {
    return <Waiting message="No boards have answered yet" />;
  }
  return <BoardGrid boards={boards} onOpen={onOpen} />;
}

export function App() {
  const state = useAppState();
  // The ID outlives the open flag, so the title holds through the slide-out
  const [selectedId, setSelectedId] = useState<number>();
  const [opened, { open, close }] = useDisclosure();
  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1}>RVL Setup</Title>
        <FleetStatus />
        {renderBoards(state, (deviceId) => {
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
