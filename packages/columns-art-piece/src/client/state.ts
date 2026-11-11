import { atom } from 'jotai';

import { type Column, type Fleet, type Settings } from '../common/messages.ts';

export const socketAtom = atom<'connecting' | 'open' | 'closed'>('connecting');

export const fleetAtom = atom<Fleet | undefined>(undefined);

export const columnsAtom = atom<Column[]>([]);

// Placeholders until hello, which arrives before any control renders
export const settingsAtom = atom<Settings>({
  firstColor: '#000000',
  secondColor: '#000000',
  coverage: 100,
  rate: 0,
});
