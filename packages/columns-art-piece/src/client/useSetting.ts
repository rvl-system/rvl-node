import { useDebouncedCallback, useThrottledCallback } from '@mantine/hooks';
import { useAtomValue } from 'jotai';
import { useState } from 'react';

import { type Settings } from '../common/messages.ts';
import { sendSettings } from './connection.ts';
import { settingsAtom } from './state.ts';

const SEND_INTERVAL = 250;
// Longer than the last send and its echo take, so the server's value is the
// control's own by the time it shows
const SETTLE_DELAY = 500;

// A control shows its own value while it is changing, and the server's once
// it has been still for the delay
export function useSetting<K extends keyof Settings>(
  key: K
): [Settings[K], (value: Settings[K]) => void] {
  const settled = useAtomValue(settingsAtom)[key];
  const [draft, setDraft] = useState<Settings[K]>();
  const sendThrottled = useThrottledCallback((value: Settings[K]) => {
    const changes: Partial<Settings> = {};
    changes[key] = value;
    sendSettings(changes);
  }, SEND_INTERVAL);
  const settle = useDebouncedCallback(() => {
    setDraft(undefined);
  }, SETTLE_DELAY);
  const change = (value: Settings[K]) => {
    setDraft(value);
    sendThrottled(value);
    settle();
  };
  return [draft ?? settled, change];
}
