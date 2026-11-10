import { atom, type PrimitiveAtom } from 'jotai';
import { atomFamily } from 'jotai-family';

import { type Board, type Fleet, type Limits } from '../common/messages.ts';

export const socketAtom = atom<'connecting' | 'open' | 'closed'>('connecting');

export const fleetAtom = atom<Fleet | undefined>(undefined);

export const onlineAtom = atom(
  (get) => get(socketAtom) === 'open' && get(fleetAtom)?.connected === true
);

// Placeholders until hello, which arrives before any form renders
export const limitsAtom = atom<Limits>({
  maxPixelCount: 0,
  numChannels: 0,
  nicknameLength: 0,
  maxCurrentLimit: 0,
});

// The roster: the sorted IDs, and one atom per board, keyed by device ID,
// so a change to one board re-renders its tile and the drawer and nothing
// else
export const boardIdsAtom = atom<number[]>([]);

export const boardFamily = atomFamily<number, PrimitiveAtom<Board | undefined>>(
  () => atom<Board | undefined>(undefined)
);
