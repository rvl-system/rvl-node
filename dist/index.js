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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createManager = void 0;
const manager_1 = require("./manager");
__exportStar(require("./animation"), exports);
var types_1 = require("./types");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return types_1.LogLevel; } });
var manager_2 = require("./manager");
Object.defineProperty(exports, "getDefaultInterface", { enumerable: true, get: function () { return manager_2.getDefaultInterface; } });
Object.defineProperty(exports, "getAvailableInterfaces", { enumerable: true, get: function () { return manager_2.getAvailableInterfaces; } });
Object.defineProperty(exports, "RVLManager", { enumerable: true, get: function () { return manager_2.RVLManager; } });
var controller_1 = require("./controller");
Object.defineProperty(exports, "RVLController", { enumerable: true, get: function () { return controller_1.RVLController; } });
async function createManager(options) {
    const manager = new manager_1.RVLManager(options);
    await manager[manager_1.initManager]();
    return manager;
}
exports.createManager = createManager;
//# sourceMappingURL=index.js.map