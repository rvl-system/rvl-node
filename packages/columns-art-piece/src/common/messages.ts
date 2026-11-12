// The wire between the server and the page

// One strip, found through the board on its channel
export type Column = { channel: number; pixelCount: number };

// What a column shows under the pulse
export const ANIMATIONS = ['shift', 'wave', 'colorCycle'] as const;

export const COLOR_SETTINGS = [
  'shiftFirstColor',
  'shiftSecondColor',
  'waveColor',
  'waveForegroundColor',
  'waveBackgroundColor',
  'pulseColor',
] as const;
export const NUMBER_SETTINGS = [
  'shiftCoverage',
  'shiftRate',
  'waveRate',
  'waveCrests',
  'colorCycleRate',
  'pulseIntensity',
  'pulseAttack',
  'pulseDecay',
  'pulseMinDelay',
  'pulseDelaySpread',
] as const;

export type Animation = (typeof ANIMATIONS)[number];
type ColorSetting = (typeof COLOR_SETTINGS)[number];
export type NumberSetting = (typeof NUMBER_SETTINGS)[number];

// Colors are #rrggbb, and numbers are whole and inside their ranges
export type Settings = { animation: Animation; pulseEnabled: boolean } & Record<
  ColorSetting,
  string
> &
  Record<NumberSetting, number>;

export const NUMBER_RANGES: Record<
  NumberSetting,
  { min: number; max: number }
> = {
  // How much of the sweep between the two colors a column shows, in percent
  shiftCoverage: { min: 80, max: 160 },
  // The w_t an animation moves at, as a board's Rate control sets it
  shiftRate: { min: 0, max: 32 },
  waveRate: { min: 0, max: 32 },
  // How many a column holds
  waveCrests: { min: 1, max: 4 },
  // From 1, where rvl-node's color cycle starts
  colorCycleRate: { min: 1, max: 32 },
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

export function isAnimation(value: unknown): value is Animation {
  return ANIMATIONS.some((animation) => animation === value);
}

export type ServerMessage =
  | { type: 'hello'; columns: Column[]; settings: Settings }
  | { type: 'columns'; columns: Column[] }
  | { type: 'settings'; settings: Settings };

export type ClientMessage = { type: 'set'; settings: Partial<Settings> };
