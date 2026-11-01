import { Badge, Group, Text } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { fleetAtom, socketAtom } from './state.ts';

export function FleetStatus() {
  const socket = useAtomValue(socketAtom);
  const fleet = useAtomValue(fleetAtom);
  return (
    <Group gap="sm">
      <Badge variant="light" color={socket === 'open' ? 'green' : 'yellow'}>
        {socket === 'open' ? 'Server connected' : 'Reconnecting to the server'}
      </Badge>
      <Badge variant="light" color={fleet?.connected ? 'green' : 'gray'}>
        {fleet?.connected
          ? `On the fleet as ID ${fleet.deviceId}`
          : 'Waiting for the coordinator'}
      </Badge>
      {fleet && (
        <Text size="sm" c="dimmed">
          {fleet.interface}
        </Text>
      )}
    </Group>
  );
}
