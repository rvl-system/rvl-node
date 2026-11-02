import { Badge, Stack, Table, Text } from '@mantine/core';
import { type ReactNode } from 'react';

import { type Board } from '../common/messages.ts';
import { BoardName } from './BoardName.tsx';
import { IdentifyButton } from './IdentifyButton.tsx';

type Property = keyof Board['capabilities'];

type Row = { label: string; value: ReactNode; note?: string };

// Why a board doesn't honor a property; slice 4's disabled controls say
// the same
function describeMissing(property: Property): string {
  switch (property) {
    case 'channel':
    case 'brightness':
      return 'set on the board';
    case 'statusLedBrightness':
      return 'no status LED';
    default:
      return 'not supported';
  }
}

function noteFor(board: Board, property: Property): string | undefined {
  return board.capabilities[property] ? undefined : describeMissing(property);
}

function describeRows(board: Board): Row[] {
  return [
    { label: 'Device ID', value: board.deviceId },
    { label: 'Channel', value: board.channel, note: noteFor(board, 'channel') },
    {
      label: 'Brightness',
      value: `${board.brightness} of 255`,
      note: noteFor(board, 'brightness'),
    },
    {
      label: 'Pixel count',
      value: board.pixelCount,
      note: noteFor(board, 'pixelCount'),
    },
    {
      label: 'Color order',
      value: board.colorOrder,
      note: noteFor(board, 'colorOrder'),
    },
    {
      label: 'Status LED brightness',
      value: `${board.statusLedBrightness} of 255`,
      note: noteFor(board, 'statusLedBrightness'),
    },
    {
      label: 'Nickname',
      value: <BoardName board={board} fw={400} />,
      note: noteFor(board, 'nickname'),
    },
  ];
}

export function BoardDetails({ board }: { board: Board }) {
  return (
    <Stack>
      {!board.answering && (
        <Badge color="gray" w="fit-content">
          Not answering
        </Badge>
      )}
      <Table variant="vertical" layout="fixed">
        <Table.Tbody>
          {describeRows(board).map((row) => (
            <Table.Tr key={row.label}>
              <Table.Th w={180}>{row.label}</Table.Th>
              <Table.Td>
                {row.value}
                {row.note !== undefined && (
                  <Text span size="xs" c="dimmed" ml="xs">
                    {row.note}
                  </Text>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <IdentifyButton deviceId={board.deviceId} />
    </Stack>
  );
}
