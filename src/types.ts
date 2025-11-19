export type RVLManagerOptions = {
  networkInterface?: string;
  port?: number;
};

export type WaveChannel = {
  a: number;
  b: number;
  w_t: number;
  w_x: number;
  phi: number;
};

export type Wave = {
  h: WaveChannel;
  s: WaveChannel;
  v: WaveChannel;
  a: WaveChannel;
};

export type WaveParameters = {
  timePeriod?: number; // Default 255
  distancePeriod?: number; // Default 32
  waves: Wave[];
};
