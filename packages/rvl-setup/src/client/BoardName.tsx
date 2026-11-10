import { Text, type TextProps } from '@mantine/core';

import { type Board } from '../common/messages.ts';

type Props = { board: Board; fw?: TextProps['fw'] };

export function BoardName({ board, fw = 600 }: Props) {
  return board.nickname === '' ? (
    <Text fw={fw} fs="italic" c="dimmed" truncate>
      unnamed
    </Text>
  ) : (
    <Text fw={fw} truncate>
      {board.nickname}
    </Text>
  );
}
