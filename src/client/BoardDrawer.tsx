import { Drawer, Text } from '@mantine/core';
import { useAtomValue } from 'jotai';

import { BoardDetails } from './BoardDetails.tsx';
import { BoardName } from './BoardName.tsx';
import { boardFamily } from './state.ts';

type Props = {
  deviceId: number;
  opened: boolean;
  onClose: () => void;
};

export function BoardDrawer({ deviceId, opened, onClose }: Props) {
  const board = useAtomValue(boardFamily(deviceId));
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={board ? <BoardName board={board} /> : `Board ${deviceId}`}
    >
      {board ? (
        <BoardDetails board={board} />
      ) : (
        <Text c="dimmed">This board has stopped answering.</Text>
      )}
    </Drawer>
  );
}
