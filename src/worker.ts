/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

RVL Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

RVL Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with RVL Node.  If not, see <http://www.gnu.org/licenses/>.
*/

import {
  IMessage,
  IWorkerOptions,
  IInitCompleteMessage,
  ISetWaveParametersMessage,
  ISetBrightnessMessage,
  ISetPowerStateMessage
} from './types';
import { init } from './bridge';

const options: IWorkerOptions = JSON.parse(process.argv[2]);

function sendMessage(msg: Record<string, any>) {
  if (!process.send) {
    throw new Error('This module must be called from a child process');
  }
  process.send(msg);
}

process.on('message', (message: IMessage) => {
  switch (message.type) {
    case 'setWaveParameters':
      console.log(message as ISetWaveParametersMessage);
      break;
    case 'setBrightness':
      console.log(message as ISetBrightnessMessage);
      break;
    case 'setPowerState':
      console.log(message as ISetPowerStateMessage);
      break;
    default:
      throw new Error(`Internal Error: received unknown message type "${message.type}" from parent process`);
  }
});

(async () => {
  await init(options.logLevel, options.channel);
  const initMessage: IInitCompleteMessage = {
    type: 'initComplete'
  };
  sendMessage(initMessage);
})();
