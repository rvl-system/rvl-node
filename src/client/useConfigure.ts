import { useState } from 'react';

import { type ConfigureFields } from '../common/messages.ts';
import { configureBoard } from './connection.ts';

export function useConfigure(deviceId: number) {
  const [outstanding, setOutstanding] = useState(0);
  const [error, setError] = useState<string>();

  async function configure(fields: ConfigureFields): Promise<boolean> {
    setOutstanding((count) => count + 1);
    setError(undefined);
    try {
      await configureBoard(deviceId, fields);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed');
      return false;
    } finally {
      setOutstanding((count) => count - 1);
    }
  }

  return { pending: outstanding > 0, error, configure };
}
