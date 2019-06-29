/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Node.

Raver Lights Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <stdint.h>
#include <stdio.h>
#include <RVLMessaging.h>
#include <RVLLogging.h>
#include "./wasm_platform.h"

WASMPlatform::WASMLogging* loggingInterface;
WASMPlatform::WASMPlatform* platform;
WASMPlatform::WASMTransport* transport;
RVLLogging* logger;

extern "C" RVLWaveSettings* init(uint8_t logLevel, bool isController, uint8_t channel) {
  loggingInterface = new WASMPlatform::WASMLogging();
  platform = new WASMPlatform::WASMPlatform();
  transport = new WASMPlatform::WASMTransport();
  logger = new RVLLogging(loggingInterface, static_cast<RVLLogLevel>(logLevel));
  if (isController) {
    platform->setDeviceMode(RVLDeviceMode::Controller);
  } else {
    platform->setDeviceMode(RVLDeviceMode::Receiver);
  }
  logger->debug("Setting channel %d", channel);
  platform->setChannel(channel);
  RVLMessagingInit(platform, transport, logger);
  return platform->getWaveSettings();
}

extern "C" void loop() {
  RVLMessagingLoop();
}

extern "C" void waveParametersUpdated() {
  // Ok this one is weird. We already updated the settings by directly manipulating
  // the WASM memory buffer, but the C++ class ws never notified. We do this to get
  // all the code that reacts to settings being updated to run, even though we won't
  // *actually* set the settings here
  platform->setWaveSettings(platform->getWaveSettings());
}
