// A color in the space the firmware renders in, FastLED's hsv2rgb_spectrum,
// each component an integer from 0 to 255
type FirmwareColor = { h: number; s: number; v: number };

const SECTION_SIZE = 64;

// To linear light, since a strip's output is linear in its drive
function decodeChannel(hex: string, offset: number): number {
  const encoded = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  const linear =
    encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
  return linear * 255;
}

// The firmware puts a floor of white under all three channels and splits the
// rest between two of them, one falling as the next rises through each third
// of the hue range. This inverts that
export function convertToFirmwareColor(hex: string): FirmwareColor {
  const channels = [1, 3, 5].map((offset) => decodeChannel(hex, offset));
  const floor = Math.min(...channels);
  // Each third leaves one channel at the floor: blue, then red, then green
  const section = (channels.indexOf(floor) + 1) % 3;
  const falling = channels[section] - floor;
  const rising = channels[(section + 1) % 3] - floor;
  const colored = falling + rising;
  // A ramp tops out one step short of the amplitude
  const amplitude = (colored * SECTION_SIZE) / (SECTION_SIZE - 1);
  const offset = colored === 0 ? 0 : ((SECTION_SIZE - 1) * rising) / colored;
  const total = floor + amplitude;
  return {
    // The firmware scales hue by three quarters, rounding down, so this is
    // the lowest hue that lands on the nearest step
    h: Math.ceil((Math.round(section * SECTION_SIZE + offset) * 4) / 3),
    s: total === 0 ? 0 : Math.round((255 * amplitude) / total),
    // The two colored channels can't sum past the value, so a brighter pick
    // is capped here, which scales all three channels alike
    v: Math.round(Math.min(total, 255)),
  };
}
