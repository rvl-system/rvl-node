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

import { parentPort, workerData as options } from 'worker_threads';
import {
  IMessage,
  IRVLControllerOptions,
  IInitCompleteMessage,
  ISetWaveParametersMessage,
  ISetBrightnessMessage,
  ISetPowerStateMessage
} from './messageTypes';

console.log(options as IRVLControllerOptions);

if (!parentPort) {
  throw new Error('This file must be executed in a worker thread');
}

parentPort.on('message', (message: IMessage) => {
  switch (message.type) {
    case 'setWaveParameters':
      console.log(message as ISetWaveParametersMessage);
    case 'setBrightness':
      console.log(message as ISetBrightnessMessage);
    case 'setPowerState':
      console.log(message as ISetPowerStateMessage);
    default:
      throw new Error(`Internal Error: received unknown parent thread message type ${message.type}`);
  }
});

const initMessage: IInitCompleteMessage = {
  type: 'initComplete'
};
parentPort.postMessage(initMessage);
