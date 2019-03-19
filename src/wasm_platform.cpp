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

#include <string.h>
#include "./wasm_platform.h"

extern "C" void jsPrintString(const char *s, uint16_t len);
extern "C" void jsPrintlnString(const char *s, uint16_t len);

extern "C" uint32_t jsGetRelativeTime();
extern "C" uint16_t jsGetDeviceId();

extern "C" void jsBeginWrite();
extern "C" void jsWrite8(uint8_t val);
extern "C" void jsWrite16(uint16_t val);
extern "C" void jsWrite32(uint32_t val);
extern "C" void jsWriteBuffer(uint8_t *buf, uint16_t len);
extern "C" void jsEndWrite();

extern "C" uint16_t jsParsePacket();
extern "C" uint8_t jsRead8();
extern "C" uint16_t jsRead16();
extern "C" uint32_t jsRead32();
extern "C" void jsRead(uint8_t *buf, uint16_t len);

namespace WASMPlatform {

// Logging implementation

void WASMLogging::print(const char *s) {
  jsPrintString(s, strlen(s));
}

void WASMLogging::println() {
  jsPrintlnString("", 0);
}

void WASMLogging::println(const char *s) {
  jsPrintlnString(s, strlen(s));
}

// Platform implementation

uint32_t WASMPlatform::getLocalTime() {
  return jsGetRelativeTime();
}

uint16_t WASMPlatform::getDeviceId() {
  return jsGetDeviceId();
}

// Transport implementation

void WASMTransport::beginWrite() {
  jsBeginWrite();
}

void WASMTransport::write8(uint8_t data) {
  jsWrite8(data);
}

void WASMTransport::write16(uint16_t data) {
  jsWrite16(data);
}

void WASMTransport::write32(uint32_t data) {
  jsWrite32(data);
}

void WASMTransport::write(uint8_t* data, uint16_t length) {
  jsWriteBuffer(data, length);
}

void WASMTransport::endWrite() {
  jsEndWrite();
}

uint16_t WASMTransport::parsePacket() {
  return jsParsePacket();
}

uint8_t WASMTransport::read8() {
  return jsRead8();
}

uint16_t WASMTransport::read16() {
  return jsRead16();
}

uint32_t WASMTransport::read32() {
  return jsRead32();
}

void WASMTransport::read(uint8_t* buffer, uint16_t length) {
  jsRead(buffer, length);
}

}  // namespace WASMPlatform
