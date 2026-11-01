import { Drawer } from '@mantine/core';

import { BoardName } from './BoardName.tsx';
import { useAppState } from './connection.ts';

type Props = {
  deviceId: number;
  opened: boolean;
  onClose: () => void;
};

// Read from the store rather than given the board, so the title follows a
// rename while it is open. Slice 3 fills it
export function BoardDrawer({ deviceId, opened, onClose }: Props) {
  const { boards } = useAppState();
  const board = boards.find((candidate) => candidate.deviceId === deviceId);
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={board ? <BoardName board={board} /> : `Board ${deviceId}`}
    />
  );
}
