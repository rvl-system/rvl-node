// The wire between the server and the page. Declared here rather than
// imported from rvl-node, so the browser bundle never pulls it in; the
// server assigns rvl-node's NodeStatus into Board, which keeps the two in
// step at compile time

export const SOCKET_PATH = '/rvl-setup/ws';

export const COLOR_ORDERS = ['RGB', 'RBG', 'GRB', 'GBR', 'BRG', 'BGR'] as const;

export type ColorOrder = (typeof COLOR_ORDERS)[number];

export function isColorOrder(value: unknown): value is ColorOrder {
  return (
    typeof value === 'string' &&
    (COLOR_ORDERS as readonly string[]).includes(value)
  );
}

// The properties a board can be configured with, in the wire's order
const PROPERTIES = [
  'channel',
  'brightness',
  'pixelCount',
  'colorOrder',
  'statusLedBrightness',
  'nickname',
  'currentLimit',
] as const;

export type Property = (typeof PROPERTIES)[number];

export function isProperty(value: unknown): value is Property {
  return (
    typeof value === 'string' &&
    (PROPERTIES as readonly string[]).includes(value)
  );
}

type BoardProperties = {
  channel: number;
  brightness: number;
  pixelCount: number;
  colorOrder: ColorOrder;
  statusLedBrightness: number;
  nickname: string;
  currentLimit: number;
};

export type Board = BoardProperties & {
  deviceId: number;
  capabilities: { [P in Property]: boolean };
  answering: boolean;
};

export type Fleet = { interface: string } & (
  { connected: true; deviceId: number } | { connected: false }
);

// The bounds on the controls, which the server reads from rvl-node
export type Limits = {
  maxPixelCount: number;
  numChannels: number;
  nicknameLength: number;
  maxCurrentLimit: number;
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

// One variant per property, so the value's type follows the property
export type ConfigureMessage = {
  [P in Property]: {
    type: 'configure';
    requestId: number;
    deviceId: number;
    property: P;
    value: BoardProperties[P];
  };
}[Property];

export type ClientMessage =
  { type: 'identify'; requestId: number; deviceId: number } | ConfigureMessage;

export type ClientRequest = DistributiveOmit<ClientMessage, 'requestId'>;

export type ConfigureFields = DistributiveOmit<
  ConfigureMessage,
  'type' | 'requestId' | 'deviceId'
>;

export type ServerMessage =
  | { type: 'hello'; fleet: Fleet; boards: Board[]; limits: Limits }
  | { type: 'fleet'; fleet: Fleet }
  | { type: 'boards'; boards: Board[] }
  | { type: 'result'; requestId: number; board: Board }
  | { type: 'result'; requestId: number; error: string };
