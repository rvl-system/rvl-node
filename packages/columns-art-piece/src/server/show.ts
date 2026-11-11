import { MIN_FADE_FRAMES, setAnimationParameters } from 'rvl-node';

import { type Column, type Settings } from '../common/messages.ts';
import { getColumns } from './fleet.ts';
import { buildColumnScene } from './scene.ts';

let settings: Settings = {
  firstColor: '#ff0000',
  secondColor: '#0000ff',
  coverage: 120,
  rate: 8,
};

export function getSettings(): Settings {
  return settings;
}

function showColumn({ channel, pixelCount }: Column): void {
  void setAnimationParameters(channel, buildColumnScene(settings, pixelCount), {
    fadeFrames: MIN_FADE_FRAMES,
  });
}

// rvl-node drops a scene its channel already has, so only a column whose
// scene changed is sent
export function showColumns(): void {
  for (const column of getColumns()) {
    showColumn(column);
  }
}

export function applySettings(changes: Partial<Settings>): void {
  settings = { ...settings, ...changes };
  showColumns();
}
