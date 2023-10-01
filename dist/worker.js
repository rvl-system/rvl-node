"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const bridge_1 = require("./bridge");
const util_1 = require("./util");
const options = JSON.parse(process.argv[2]);
process.on('message', (message) => {
    switch (message.type) {
        case 'setWaveParameters':
            (0, bridge_1.setWaveParameters)(message.waveParameters);
            break;
        case 'setBrightness':
            (0, bridge_1.setBrightness)(message.brightness);
            break;
        case 'setPowerState':
            (0, bridge_1.setPowerState)(message.powerState);
            break;
        case 'receivedPacket':
            (0, bridge_1.receivePacket)(Buffer.from(message.payload, 'base64'));
            break;
        default:
            throw new Error(`Internal Error: received unknown message type "${message.type}" from parent process`);
    }
});
(async () => {
    await (0, bridge_1.init)(options.logLevel, options.channel, options.deviceId);
    const initMessage = {
        type: 'initComplete'
    };
    (0, util_1.sendMessage)(initMessage);
})();
//# sourceMappingURL=worker.js.map