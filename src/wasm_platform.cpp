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

}

void WASMTransport::write8(uint8_t data) {

}

void WASMTransport::write16(uint16_t data) {

}

void WASMTransport::write32(uint32_t data) {

}

void WASMTransport::write(uint8_t* data, uint16_t length) {

}

void WASMTransport::endWrite() {

}


uint16_t WASMTransport::parsePacket() {
  return 0;
}

uint8_t WASMTransport::read8() {
  return 0;
}

uint16_t WASMTransport::read16() {
  return 0;
}

uint32_t WASMTransport::read32() {
  return 0;
}

void WASMTransport::read(uint8_t* buffer, uint16_t length) {

}

}  // namespace WASMPlatform
