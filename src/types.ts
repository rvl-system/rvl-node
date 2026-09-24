export type RVLManagerOptions = {
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
  timePeriod?: number; // 1 to 255, default 255
  distancePeriod?: number; // 1 to 255, default 32
  animations: AnimationLayer[];
};
