import { Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { ColorSetting } from './ColorSetting.tsx';
import { FleetStatus } from './FleetStatus.tsx';
import { SliderSetting } from './SliderSetting.tsx';
import { columnsAtom, fleetAtom } from './state.ts';

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

export function App() {
  const fleet = useAtomValue(fleetAtom);
  return (
    <Container size="sm" py="xl">
      <Stack>
        <Title order={1}>Columns</Title>
        <FleetStatus />
        {fleet === undefined ? (
          <Group gap="sm">
            <Loader size="sm" />
            <Text c="dimmed">Connecting to the server</Text>
          </Group>
        ) : (
          <>
            <ColumnList />
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
          </>
        )}
      </Stack>
    </Container>
  );
}
