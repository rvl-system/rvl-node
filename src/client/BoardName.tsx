import { Text } from '@mantine/core';

import { type Board } from '../common/messages.ts';

export function getBoardLabel(board: Board): string {
  return board.nickname === '' ? `board ${board.deviceId}` : board.nickname;
}

export function BoardName({ board }: { board: Board }) {
  return board.nickname === '' ? (
    <Text fw={600} fs="italic" c="dimmed" truncate>
      unnamed
    </Text>
  ) : (
    <Text fw={600} truncate>
      {board.nickname}
    </Text>
  );
}
