import { atom, type PrimitiveAtom } from 'jotai';
import { atomFamily } from 'jotai-family';

import { type Board, type Fleet } from '../common/messages.ts';

export const socketAtom = atom<'connecting' | 'open' | 'closed'>('connecting');

export const fleetAtom = atom<Fleet | undefined>(undefined);

// The roster: the sorted IDs, and one atom per board, keyed by device ID,
// so a change to one board re-renders its tile and the drawer and nothing
// else
export const boardIdsAtom = atom<number[]>([]);

export const boardFamily = atomFamily<number, PrimitiveAtom<Board | undefined>>(
  () => atom<Board | undefined>(undefined)
);
