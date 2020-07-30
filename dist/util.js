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
exports.sendMessage = exports.wait = void 0;
async function wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration));
}
exports.wait = wait;
function sendMessage(msg) {
    if (!process.send) {
        throw new Error('This module must be called from a child process');
    }
    process.send(msg);
}
exports.sendMessage = sendMessage;
//# sourceMappingURL=util.js.map