export type RVLManagerOptions = {
  networkInterface?: string;
  port?: number;
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
  timePeriod?: number; // Default 255
  distancePeriod?: number; // Default 32
  animations: AnimationLayer[];
};
