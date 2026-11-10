import { SimpleGrid } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { BoardTile } from './BoardTile.tsx';
import { boardIdsAtom } from './state.ts';

export function BoardGrid({ onOpen }: { onOpen: (deviceId: number) => void }) {
  const boardIds = useAtomValue(boardIdsAtom);
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {boardIds.map((deviceId) => (
        <BoardTile key={deviceId} deviceId={deviceId} onOpen={onOpen} />
      ))}
    </SimpleGrid>
  );
}
