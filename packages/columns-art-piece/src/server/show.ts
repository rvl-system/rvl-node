import { MIN_FADE_FRAMES, setAnimationParameters } from 'rvl-node';

import { type Column, type Settings } from '../common/messages.ts';
import { getColumns } from './columns.ts';
import { buildColumnScene } from './scene.ts';

let settings: Settings = {
  animation: 'shift',
  shiftFirstColor: '#b30000',
  shiftSecondColor: '#0000b3',
  shiftCoverage: 120,
  shiftRate: 8,
  waveColor: '#b30000',
  waveForegroundColor: '#0000b3',
  waveBackgroundColor: '#00b300',
  waveRate: 8,
  waveCrests: 1,
  colorCycleRate: 3,
  pulseEnabled: true,
  pulseColor: '#ffbac7',
  pulseIntensity: 255,
  pulseAttack: 5,
  pulseDecay: 18,
  pulseMinDelay: 1,
  pulseDelaySpread: 7,
};

export function getSettings(): Settings {
  return settings;
}

// Replaces the object, so a reference taken earlier keeps its values
export function applySettings(changes: Partial<Settings>): void {
  settings = { ...settings, ...changes };
}

export function sendColumnScene(
  { channel, pixelCount }: Column,
  sceneSettings: Settings,
  withPulse: boolean,
  fadeFrames: number
): void {
  void setAnimationParameters(
    channel,
    buildColumnScene(sceneSettings, pixelCount, withPulse),
    { fadeFrames }
  );
}

// rvl-node drops a scene its channel already has, so only a column whose
// scene changed is sent
export function showColumns(): void {
  for (const column of getColumns()) {
    sendColumnScene(column, settings, false, MIN_FADE_FRAMES);
  }
}
