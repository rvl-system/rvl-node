export type RVLInitOptions = {
  networkInterface?: string;
};

export type AnimationColorParameters = {
  a: number;
  b: number;
  w_t: number;
  w_x: number;
  phi: number;
};

export type AnimationLayer = {
  h: AnimationColorParameters;
  s: AnimationColorParameters;
  v: AnimationColorParameters;
  a: AnimationColorParameters;
};

export type AnimationParameters = {
  timePeriod?: number; // 1 to 255
  distancePeriod?: number; // 1 to 255
  animations: AnimationLayer[];
};

export type SceneOptions = {
  startFrame?: number; // a fleet frame, default the gate's choice
  fadeFrames?: number; // 16 to 255
};

// The order a strip reads its three bytes in
export type ColorOrder = 'RGB' | 'RBG' | 'GRB' | 'GBR' | 'BRG' | 'BGR';

// The properties a board can be configured with over the wire
export type NodeConfiguration = {
  channel: number; // 0 to 7
  brightness: number; // 0 to 255
  pixelCount: number; // 1 to MAX_PIXEL_COUNT
  colorOrder: ColorOrder;
  statusLedBrightness: number; // 0 to 255
  nickname: string; // up to 16 printable ASCII characters
  currentLimit: number; // 1 to MAX_CURRENT_LIMIT, in mA
};

// Which of the properties a board honors
export type NodeCapabilities = { [P in keyof NodeConfiguration]: boolean };

export type NodeStatus = NodeConfiguration & {
  deviceId: number;
  capabilities: NodeCapabilities;
};
