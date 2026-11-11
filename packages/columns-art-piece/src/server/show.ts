import { MIN_FADE_FRAMES, setAnimationParameters } from 'rvl-node';

import { type Column, type Settings } from '../common/messages.ts';
import { getColumns } from './columns.ts';
import { buildColumnScene } from './scene.ts';

let settings: Settings = {
  firstColor: '#ff0000',
  secondColor: '#0000ff',
  coverage: 120,
  rate: 8,
  pulseColor: '#ffffff',
  pulseIntensity: 255,
  pulseAttack: 5,
  pulseDecay: 30,
  pulseMinDelay: 5,
  pulseDelaySpread: 10,
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
