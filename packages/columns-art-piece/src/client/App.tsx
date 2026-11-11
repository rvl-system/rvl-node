import {
  Container,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { useAtomValue } from 'jotai';
import { FleetStatus, SetupPanel } from 'rvl-setup/client';

import { ColorSetting } from './ColorSetting.tsx';
import { SliderSetting } from './SliderSetting.tsx';
import { columnsAtom, hasHelloAtom } from './state.ts';

function formatTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function ColumnList() {
  const columns = useAtomValue(columnsAtom);
  if (columns.length === 0) {
    return <Text c="dimmed">No columns have answered yet</Text>;
  }
  return (
    <Text>
      {columns
        .map(
          ({ channel, pixelCount }) =>
            `Channel ${channel}: ${pixelCount} pixels`
        )
        .join(' · ')}
    </Text>
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
    <Stack maw="var(--container-size-sm)">
      <ColumnList />
      <ColorSetting setting="firstColor" label="First color" />
      <ColorSetting setting="secondColor" label="Second color" />
      <SliderSetting
        setting="coverage"
        formatLabel={(coverage) => `Coverage: ${coverage}%`}
      />
      <SliderSetting setting="rate" formatLabel={(rate) => `Rate: ${rate}`} />
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
