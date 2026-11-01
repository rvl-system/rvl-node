import { SimpleGrid } from '@mantine/core';

import { type Board } from '../common/messages.ts';
import { BoardTile } from './BoardTile.tsx';

type Props = {
  boards: Board[];
  onOpen: (deviceId: number) => void;
};

export function BoardGrid({ boards, onOpen }: Props) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {boards.map((board) => (
        <BoardTile key={board.deviceId} board={board} onOpen={onOpen} />
      ))}
    </SimpleGrid>
  );
}
