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

#ifndef WASM_PLAFORM_H_
#define WASM_PLAFORM_H_

#include <RaverLightsMessaging.h>

namespace WASMPlatform {

class WASMLogging : public RVLLoggingInterface {
 public:
  RVLLogLevel getLogLevel();
  void print(const char s);
  void print(const char *s);
  void println();
  void println(const char s);
  void println(const char *s);
};


class WASMPlatform : public RVLPlatformInterface {
 private:
  uint32_t clockOffset;
  uint16_t deviceId;
  RVLWaveSettings waveSettings;
  RVLDeviceMode deviceMode = RVLDeviceMode::Controller;

 public:
  uint32_t getLocalTime();
  uint32_t getClockOffset();
  void setClockOffset(uint32_t newOffset);

  void setDeviceMode(RVLDeviceMode newDeviceMode);
  RVLDeviceMode getDeviceMode();
  uint16_t getDeviceId();

  RVLWaveSettings* getWaveSettings();
  void setWaveSettings(RVLWaveSettings* newWaveSettings);
};

}  // namespace WASMPlatform

#endif
