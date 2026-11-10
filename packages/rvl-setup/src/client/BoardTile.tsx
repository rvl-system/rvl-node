import { Badge, Card, Group, Text, UnstyledButton } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { BoardName } from './BoardName.tsx';
import { IdentifyButton } from './IdentifyButton.tsx';
import { boardFamily } from './state.ts';

type Props = {
  deviceId: number;
  onOpen: (deviceId: number) => void;
};

export function BoardTile({ deviceId, onOpen }: Props) {
  const board = useAtomValue(boardFamily(deviceId));
  if (board === undefined) {
    return null;
  }
  return (
    <Card
      withBorder
      padding="md"
      style={{ opacity: board.answering ? 1 : 0.5 }}
    >
      <Group justify="space-between" wrap="nowrap">
        <UnstyledButton
          onClick={() => {
            onOpen(deviceId);
          }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <BoardName board={board} />
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              ID {deviceId}
            </Text>
            {!board.answering && (
              <Badge color="gray" size="sm">
                Not answering
              </Badge>
            )}
          </Group>
        </UnstyledButton>
        <IdentifyButton deviceId={deviceId} />
      </Group>
    </Card>
  );
}
