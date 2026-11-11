import { type Column } from '../common/messages.ts';

type ColumnBoard = { deviceId: number; channel: number; pixelCount: number };

let columns: Column[] = [];

export function getColumns(): Column[] {
  return columns;
}

// One per channel, from the board with the lowest device ID on it
function buildColumns(boards: ColumnBoard[]): Column[] {
  const byChannel = new Map<number, ColumnBoard>();
  for (const board of boards) {
    const held = byChannel.get(board.channel);
    if (held === undefined || board.deviceId < held.deviceId) {
      byChannel.set(board.channel, board);
    }
  }
  return [...byChannel.values()]
    .map(({ channel, pixelCount }) => ({ channel, pixelCount }))
    .sort((a, b) => a.channel - b.channel);
}

function haveSameColumns(a: Column[], b: Column[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (column, index) =>
        column.channel === b[index].channel &&
        column.pixelCount === b[index].pixelCount
    )
  );
}

export function replaceColumnsIfChanged(boards: ColumnBoard[]): boolean {
  const listed = buildColumns(boards);
  if (haveSameColumns(listed, columns)) {
    return false;
  }
  columns = listed;
  return true;
}
