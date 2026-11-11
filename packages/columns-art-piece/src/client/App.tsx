import {
  Container,
  Group,
  Loader,
  rem,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { useAtomValue } from 'jotai';
import { FleetStatus, SetupPanel } from 'rvl-setup/client';

import { ColorSetting } from './ColorSetting.tsx';
import { SliderSetting } from './SliderSetting.tsx';
import { columnsAtom, hasHelloAtom } from './state.ts';

// The table's own border, between the labels and the channels only
const LABEL_STYLE = {
  borderInlineEnd: `${rem(1)} solid var(--table-border-color)`,
};

function formatTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function ColumnTable() {
  const columns = useAtomValue(columnsAtom);
  if (columns.length === 0) {
    return <Text c="dimmed">No columns have answered yet</Text>;
  }
  return (
    <Table w="fit-content" mx="auto">
      <Table.Tbody>
        <Table.Tr>
          <Table.Th style={LABEL_STYLE}>Channel</Table.Th>
          {columns.map(({ channel }) => (
            <Table.Td key={channel}>{channel}</Table.Td>
          ))}
        </Table.Tr>
        <Table.Tr>
          <Table.Th style={LABEL_STYLE}>Pixels</Table.Th>
          {columns.map(({ channel, pixelCount }) => (
            <Table.Td key={channel}>{pixelCount}</Table.Td>
          ))}
        </Table.Tr>
      </Table.Tbody>
    </Table>
  );
}

function AnimationPanel() {
  const hasHello = useAtomValue(hasHelloAtom);
  if (!hasHello) {
    return (
      <Group gap="sm">
        <Loader size="sm" />
        <Text c="dimmed">Connecting to the server</Text>
      </Group>
    );
  }
  return (
    <Stack gap="xl">
      <ColumnTable />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack>
          <Title order={2}>Shift</Title>
          <ColorSetting setting="firstColor" label="First color" />
          <ColorSetting setting="secondColor" label="Second color" />
          <SliderSetting
            setting="coverage"
            formatLabel={(coverage) => `Coverage: ${coverage}%`}
          />
          <SliderSetting
            setting="rate"
            formatLabel={(rate) => `Rate: ${rate}`}
          />
        </Stack>
        <Stack>
          <Title order={2}>Pulse</Title>
          <ColorSetting setting="pulseColor" label="Pulse color" />
          <SliderSetting
            setting="pulseIntensity"
            formatLabel={(intensity) => `Pulse intensity: ${intensity}`}
          />
          <SliderSetting
            setting="pulseAttack"
            formatLabel={(tenths) => `Attack: ${formatTenths(tenths)} s`}
          />
          <SliderSetting
            setting="pulseDecay"
            formatLabel={(tenths) => `Decay: ${formatTenths(tenths)} s`}
          />
          <SliderSetting
            setting="pulseMinDelay"
            formatLabel={(seconds) => `Minimum delay: ${seconds} s`}
          />
          <SliderSetting
            setting="pulseDelaySpread"
            formatLabel={(seconds) => `Delay spread: ${seconds} s`}
          />
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}

export function App() {
  return (
    <Container size="lg" py="xl">
      <Stack>
        <Title order={1}>Columns</Title>
        <FleetStatus />
        <Tabs defaultValue="animation" keepMountedMode="display-none">
          <Tabs.List>
            <Tabs.Tab value="animation">Animation</Tabs.Tab>
            <Tabs.Tab value="setup">Setup</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="animation" pt="md">
            <AnimationPanel />
          </Tabs.Panel>
          <Tabs.Panel value="setup" pt="md">
            <SetupPanel />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
