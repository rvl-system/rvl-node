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
#include <rvl.h>
#include "./nodePlatform.h"

namespace NodePlatform {

System::System() {
  this->setConnectedState(true);
}

void System::loop() {}

extern "C" { extern void jsBeginWrite(uint8_t destination); }
void System::beginWrite(uint8_t destination) {
  jsBeginWrite(destination);
}

extern "C" { extern void jsWrite8(uint8_t data); }
void System::write8(uint8_t data) {
  jsWrite8(data);
}

extern "C" { extern void jsWrite16(uint16_t data); }
void System::write16(uint16_t data) {
  jsWrite16(data);
}

extern "C" { extern void jsWrite32(uint32_t data); }
void System::write32(uint32_t data) {
  jsWrite32(data);
}

extern "C" { extern void jsWrite(uint8_t* data, uint16_t length); }
void System::write(uint8_t* data, uint16_t length) {
  jsWrite(data, length);
}

extern "C" { extern void jsEndWrite(); }
void System::endWrite() {
  jsEndWrite();
}

extern "C" { extern uint16_t jsParsePacket(); }
uint16_t System::parsePacket() {
  return jsParsePacket();
}

extern "C" { extern uint8_t jsRead8(); }
uint8_t System::read8() {
  return jsRead8();

}

extern "C" { extern uint16_t jsRead16(); }
uint16_t System::read16() {
  return jsRead16();
}

extern "C" { extern uint32_t jsRead32(); }
uint32_t System::read32() {
  return jsRead32();
}

extern "C" { extern void jsRead(uint8_t* buffer, uint16_t length); }
void System::read(uint8_t* buffer, uint16_t length) {
  jsRead(buffer, length);
}

extern "C" { extern uint16_t jsGetDeviceId(); }
uint16_t System::getDeviceId() {
  return jsGetDeviceId();
}

extern "C" { extern uint32_t jsLocalClock(); }
uint32_t System::localClock() {
  return jsLocalClock();
}

extern "C" { extern void jsPrint(const char* msg); }
void System::print(const char* str) {
  jsPrint(str);
}

extern "C" { extern void jsPrintln(const char* msg); }
void System::println(const char* str) {
  jsPrintln(str);
}

}  // namespace NodePlatform
