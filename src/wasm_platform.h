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

#ifndef WASM_PLAFORM_H_
#define WASM_PLAFORM_H_

#include <RVLLogging.h>
#include <RVLMessaging.h>

namespace WASMPlatform {

class WASMLogging : public RVLLoggingInterface {
 public:
  void print(const char *s);
  void println();
  void println(const char *s);
};

class WASMPlatform : public RVLPlatformInterface {
 private:
  uint16_t deviceId;

 protected:
  void onWaveSettingsUpdated();

 public:
  uint32_t getLocalTime();
  uint16_t getDeviceId();
};

class WASMTransport : public RVLTransportInterface {
 public:
  void beginWrite();
  void write8(uint8_t data);
  void write16(uint16_t data);
  void write32(uint32_t data);
  void write(uint8_t* data, uint16_t length);
  void endWrite();

  uint16_t parsePacket();
  uint8_t read8();
  uint16_t read16();
  uint32_t read32();
  void read(uint8_t* buffer, uint16_t length);
};

}  // namespace WASMPlatform

#endif
