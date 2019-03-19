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
#include "wasm_platform.h"

int main() {
  return 0;
}

extern "C" void init() {
  WASMPlatform::WASMLogging logging;
  WASMPlatform::WASMPlatform platform;
  WASMPlatform::WASMTransport transport;

  char buf[40];
  sprintf(buf, "DeviceID: %d", platform.getDeviceId());
  logging.println(buf);
  sprintf(buf, "LocalTime: %d", platform.getLocalTime());

  logging.println(buf);
  transport.beginWrite();
  transport.write8(0x01);
  transport.write16(0x0203);
  transport.write32(0x04050607);
  transport.write32(0x00000000);
  uint8_t data[8] = { 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F };
  transport.write(data, 8);
  transport.endWrite();

  uint8_t rl = transport.parsePacket();
  uint8_t r8 = transport.read8();
  uint16_t r16 = transport.read16();
  uint32_t r32 = transport.read32();
  uint8_t rbuf[8];
  transport.read(rbuf, 8);
  sprintf(buf, "rl: %d, r8: %d, r16: %d, r32: %d, rbuf: %d, %d, %d, %d, %d, %d, %d, %d",
    rl, r8, r16, r32, rbuf[0], rbuf[1], rbuf[2], rbuf[3], rbuf[4], rbuf[5], rbuf[6], rbuf[7]);
  logging.println(buf);
}

extern "C" void loop() {
}

extern "C" void setWaveParameters() {
}
