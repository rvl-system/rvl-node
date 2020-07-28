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

#include <rvl.h>
#include <emscripten.h>
#include "./nodePlatform.h"

NodePlatform::System* nodeSystem;

EMSCRIPTEN_KEEPALIVE
extern "C" void init(uint8_t logLevel, uint8_t channel) {
  rvl::setLogLevel(static_cast<rvl::LogLevel>(logLevel));
  rvl::setDeviceMode(rvl::DeviceMode::Controller);
  rvl::setChannel(channel);

  nodeSystem = new NodePlatform::System();
  rvl::init(nodeSystem);

  rvl::info("Initialized");
}

EMSCRIPTEN_KEEPALIVE
extern "C" void loop() {
  rvl::loop();
}
