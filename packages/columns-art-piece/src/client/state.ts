import { atom } from 'jotai';

import { type Column, type Settings } from '../common/messages.ts';

export const hasHelloAtom = atom(false);

export const columnsAtom = atom<Column[]>([]);

// Placeholders until hello, which arrives before any control renders
export const settingsAtom = atom<Settings>({
  animation: 'shift',
  shiftFirstColor: '#000000',
  shiftSecondColor: '#000000',
  shiftCoverage: 100,
  shiftRate: 0,
  waveColor: '#000000',
  waveForegroundColor: '#000000',
  waveBackgroundColor: '#000000',
  waveRate: 0,
  waveCrests: 1,
  colorCycleRate: 1,
  pulseEnabled: false,
  pulseColor: '#000000',
  pulseIntensity: 0,
  pulseAttack: 5,
  pulseDecay: 5,
  pulseMinDelay: 0,
  pulseDelaySpread: 0,
});
