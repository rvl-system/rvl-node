import { Container, Stack, Title } from '@mantine/core';

import { FleetStatus } from './FleetStatus.tsx';
import { SetupPanel } from './SetupPanel.tsx';

export function App() {
  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1}>RVL Setup</Title>
        <FleetStatus />
        <SetupPanel />
      </Stack>
    </Container>
  );
}
