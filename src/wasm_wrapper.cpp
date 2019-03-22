/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Messaging.

Raver Lights Messaging is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Messaging is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Messaging.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <stdint.h>
#include <stdio.h>
#include <RVLMessaging.h>
#include <RVLLogging.h>
#include "wasm_platform.h"

WASMPlatform::WASMLogging* loggingInterface;
WASMPlatform::WASMPlatform* platform;
WASMPlatform::WASMTransport* transport;
RVLLogging* logger;

extern "C" RVLWaveSettings* init(uint8_t logLevel, bool isController) {
  loggingInterface = new WASMPlatform::WASMLogging();
  platform = new WASMPlatform::WASMPlatform();
  transport = new WASMPlatform::WASMTransport();
  logger = new RVLLogging(loggingInterface, static_cast<RVLLogLevel>(logLevel));
  if (isController) {
    platform->setDeviceMode(RVLDeviceMode::Controller);
  } else {
    platform->setDeviceMode(RVLDeviceMode::Receiver);
  }
  RVLMessagingInit(platform, transport, logger);
  logger->info("sizeof wave: %d", sizeof(RVLWaveSettings));
  return platform->getWaveSettings();
}

extern "C" void loop() {
  RVLMessagingLoop();
}

extern "C" void waveParametersUpdated() {
  auto waveSettings = platform->getWaveSettings();
  const char* message = "Updated Parameters:\n\
timePeriod: %d\n\
distancePeriod: %d\n\
waves\n\
  0\n\
    h\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    s\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    v\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    a\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
  1\n\
    h\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    s\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    v\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    a\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
  2\n\
    h\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    s\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    v\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    a\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
  3\n\
    h\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    s\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    v\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
    a\n\
      a: %d\n\
      b: %d\n\
      w_x: %d\n\
      w_t: %d\n\
      phi: %d\n\
";
  logger->debug(message,
    waveSettings->timePeriod,
    waveSettings->distancePeriod,

    // 0

    waveSettings->waves[0].h.a,
    waveSettings->waves[0].h.b,
    waveSettings->waves[0].h.w_x,
    waveSettings->waves[0].h.w_t,
    waveSettings->waves[0].h.phi,

    waveSettings->waves[0].s.a,
    waveSettings->waves[0].s.b,
    waveSettings->waves[0].s.w_x,
    waveSettings->waves[0].s.w_t,
    waveSettings->waves[0].s.phi,

    waveSettings->waves[0].v.a,
    waveSettings->waves[0].v.b,
    waveSettings->waves[0].v.w_x,
    waveSettings->waves[0].v.w_t,
    waveSettings->waves[0].v.phi,

    waveSettings->waves[0].a.a,
    waveSettings->waves[0].a.b,
    waveSettings->waves[0].a.w_x,
    waveSettings->waves[0].a.w_t,
    waveSettings->waves[0].a.phi,

    // 1

    waveSettings->waves[1].h.a,
    waveSettings->waves[1].h.b,
    waveSettings->waves[1].h.w_x,
    waveSettings->waves[1].h.w_t,
    waveSettings->waves[1].h.phi,

    waveSettings->waves[1].s.a,
    waveSettings->waves[1].s.b,
    waveSettings->waves[1].s.w_x,
    waveSettings->waves[1].s.w_t,
    waveSettings->waves[1].s.phi,

    waveSettings->waves[1].v.a,
    waveSettings->waves[1].v.b,
    waveSettings->waves[1].v.w_x,
    waveSettings->waves[1].v.w_t,
    waveSettings->waves[1].v.phi,

    waveSettings->waves[1].a.a,
    waveSettings->waves[1].a.b,
    waveSettings->waves[1].a.w_x,
    waveSettings->waves[1].a.w_t,
    waveSettings->waves[1].a.phi,

    // 2

    waveSettings->waves[2].h.a,
    waveSettings->waves[2].h.b,
    waveSettings->waves[2].h.w_x,
    waveSettings->waves[2].h.w_t,
    waveSettings->waves[2].h.phi,

    waveSettings->waves[2].s.a,
    waveSettings->waves[2].s.b,
    waveSettings->waves[2].s.w_x,
    waveSettings->waves[2].s.w_t,
    waveSettings->waves[2].s.phi,

    waveSettings->waves[2].v.a,
    waveSettings->waves[2].v.b,
    waveSettings->waves[2].v.w_x,
    waveSettings->waves[2].v.w_t,
    waveSettings->waves[2].v.phi,

    waveSettings->waves[2].a.a,
    waveSettings->waves[2].a.b,
    waveSettings->waves[2].a.w_x,
    waveSettings->waves[2].a.w_t,
    waveSettings->waves[2].a.phi,

    // 3

    waveSettings->waves[3].h.a,
    waveSettings->waves[3].h.b,
    waveSettings->waves[3].h.w_x,
    waveSettings->waves[3].h.w_t,
    waveSettings->waves[3].h.phi,

    waveSettings->waves[3].s.a,
    waveSettings->waves[3].s.b,
    waveSettings->waves[3].s.w_x,
    waveSettings->waves[3].s.w_t,
    waveSettings->waves[3].s.phi,

    waveSettings->waves[3].v.a,
    waveSettings->waves[3].v.b,
    waveSettings->waves[3].v.w_x,
    waveSettings->waves[3].v.w_t,
    waveSettings->waves[3].v.phi,

    waveSettings->waves[3].a.a,
    waveSettings->waves[3].a.b,
    waveSettings->waves[3].a.w_x,
    waveSettings->waves[3].a.w_t,
    waveSettings->waves[3].a.phi
    );
  // TODO
}
