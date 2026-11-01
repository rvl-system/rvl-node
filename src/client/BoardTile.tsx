import {
  Badge,
  Button,
  Card,
  Group,
  Text,
  UnstyledButton,
} from '@mantine/core';

import { type Board } from '../common/messages.ts';
import { BoardName, getBoardLabel } from './BoardName.tsx';

type Props = {
  board: Board;
  onOpen: (deviceId: number) => void;
};

export function BoardTile({ board, onOpen }: Props) {
  return (
    <Card
      withBorder
      padding="md"
      style={{ opacity: board.answering ? 1 : 0.5 }}
    >
      <Group justify="space-between" wrap="nowrap">
        <UnstyledButton
          onClick={() => {
            onOpen(board.deviceId);
          }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <BoardName board={board} />
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              ID {board.deviceId}
            </Text>
            {!board.answering && (
              <Badge color="gray" size="sm">
                Not answering
              </Badge>
            )}
          </Group>
        </UnstyledButton>
        <Button
          variant="default"
          onClick={() => {
            // Slice 3 sends the identify request
            alert(`Identifying ${getBoardLabel(board)}`);
          }}
        >
          Identify
        </Button>
      </Group>
    </Card>
  );
}
