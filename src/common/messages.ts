// The wire between the server and the page. Declared here rather than
// imported from rvl-node, so the browser bundle never pulls it in; the
// server assigns rvl-node's NodeStatus into Board, which keeps the two in
// step at compile time

type ColorOrder = 'RGB' | 'RBG' | 'GRB' | 'GBR' | 'BRG' | 'BGR';

type BoardProperties = {
  channel: number;
  brightness: number;
  pixelCount: number;
  colorOrder: ColorOrder;
  statusLedBrightness: number;
  nickname: string;
};

export type Board = BoardProperties & {
  deviceId: number;
  capabilities: { [P in keyof BoardProperties]: boolean };
  mode: 'controller' | 'receiver';
  answering: boolean;
};

export type Fleet = { interface: string } & (
  { connected: true; deviceId: number } | { connected: false }
);

export type ServerMessage =
  | { type: 'hello'; fleet: Fleet; boards: Board[] }
  | { type: 'fleet'; fleet: Fleet }
  | { type: 'boards'; boards: Board[] };
