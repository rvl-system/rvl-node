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

#include <emscripten.h>
#include <string.h>
#include "./nodePlatform.h"

namespace NodePlatform {

System::System() {

}

void System::loop() {

}

void System::beginWrite(uint8_t destination) {

}

void System::write8(uint8_t data) {

}

void System::write16(uint16_t data) {

}

void System::write32(uint32_t data) {

}

void System::write(uint8_t* data, uint16_t length) {

}

void System::endWrite() {

}

uint16_t System::parsePacket() {
  return 0;
}

uint8_t System::read8() {
  return 0;

}

uint16_t System::read16() {
  return 0;

}

uint32_t System::read32() {
  return 0;

}

void System::read(uint8_t* buffer, uint16_t length) {

}

bool System::isConnected() {
  return false;
}

uint16_t System::getDeviceId() {
  return 0;

}

extern "C" { extern uint32_t jsLocalClock(); }
uint32_t System::localClock() {
  return jsLocalClock();
}

extern "C" { extern void jsPrint(const char* msg, size_t length); }
void System::print(const char* str) {
  jsPrint(str, strlen(str));
}

extern "C" { extern void jsPrintln(const char* msg, size_t length); }
void System::println(const char* str) {
  jsPrintln(str, strlen(str));
}

}  // namespace NodePlatform
