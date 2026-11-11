// The wire between the server and the page

export type Fleet = { interface: string } & (
  { connected: true; deviceId: number } | { connected: false }
);

// One strip, found through the board on its channel
export type Column = { channel: number; pixelCount: number };

export const COLOR_SETTINGS = [
  'firstColor',
  'secondColor',
  'pulseColor',
] as const;
export const NUMBER_SETTINGS = [
  'coverage',
  'rate',
  'pulseIntensity',
  'pulseAttack',
  'pulseDecay',
  'pulseMinDelay',
  'pulseDelaySpread',
] as const;

type ColorSetting = (typeof COLOR_SETTINGS)[number];
export type NumberSetting = (typeof NUMBER_SETTINGS)[number];

// Colors are #rrggbb, and numbers are whole and inside their ranges
export type Settings = Record<ColorSetting, string> &
  Record<NumberSetting, number>;

export const NUMBER_RANGES: Record<
  NumberSetting,
  { min: number; max: number }
> = {
  // How much of the sweep between the two colors a column shows, in percent
  coverage: { min: 80, max: 160 },
  // The w_t the colors trade places at, as a board's Rate control sets it
  rate: { min: 0, max: 32 },
  // How far the pulse's color covers a column at the peak, as the layer's alpha
  pulseIntensity: { min: 0, max: 255 },
  // The fades in and out, in tenths of a second
  pulseAttack: { min: 5, max: 80 },
  pulseDecay: { min: 5, max: 80 },
  // In seconds: a pulse starts the minimum plus up to the spread after the
  // last one ended
  pulseMinDelay: { min: 0, max: 60 },
  pulseDelaySpread: { min: 0, max: 60 },
};

export type ServerMessage =
  | { type: 'hello'; fleet: Fleet; columns: Column[]; settings: Settings }
  | { type: 'fleet'; fleet: Fleet }
  | { type: 'columns'; columns: Column[] }
  | { type: 'settings'; settings: Settings };

export type ClientMessage = { type: 'set'; settings: Partial<Settings> };
