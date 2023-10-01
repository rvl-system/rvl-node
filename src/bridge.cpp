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

#include <rvl.hpp>
#include <emscripten.h>
#include "./nodePlatform.h"

#define DEFAULT_BRIGHTNESS 50

NodePlatform::System* nodeSystem;
RVLWaveSettings waveSettingsBuffer;

void run() {
  rvl::loop();
}

EMSCRIPTEN_KEEPALIVE
extern "C" void init(uint8_t logLevel, uint8_t channel, uint8_t deviceId) {
  rvl::setLogLevel(static_cast<rvl::LogLevel>(logLevel));

  rvl::setDeviceMode(rvl::DeviceMode::Controller);
  rvl::setChannel(channel);
  rvl::setPowerState(true);
  rvl::setBrightness(DEFAULT_BRIGHTNESS);

  nodeSystem = new NodePlatform::System(deviceId);
  rvl::init(nodeSystem);

  emscripten_set_main_loop(run, 200, false);
}

EMSCRIPTEN_KEEPALIVE
extern "C" RVLWaveSettings* getWaveSettingsPointer() {
  return &waveSettingsBuffer;
}

EMSCRIPTEN_KEEPALIVE
extern "C" void updateWaveSettings() {
  rvl::setWaveSettings(&waveSettingsBuffer);
}

EMSCRIPTEN_KEEPALIVE
extern "C" void updatePowerState(bool newPowerState) {
  rvl::setPowerState(newPowerState);
}

EMSCRIPTEN_KEEPALIVE
extern "C" void updateBrightness(uint8_t newBrightness) {
  rvl::setBrightness(newBrightness);
}
