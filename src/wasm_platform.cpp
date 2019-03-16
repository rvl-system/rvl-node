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

extern "C" void jsPrintChar(const char s);
extern "C" void jsPrintString(const char *s, uint16_t len);
extern "C" void jsPrintlnChar(const char s);
extern "C" void jsPrintlnString(const char *s, uint16_t len);

extern "C" uint32_t jsGetRelativeTime();
extern "C" uint16_t jsGetDeviceId();

namespace WASMPlatform {

// Logging implementation

RVLLogLevel WASMLogging::getLogLevel() {
  return RVLLogLevel::Info;
}

void WASMLogging::print(const char s) {
  jsPrintChar(s);
}

void WASMLogging::print(const char *s) {
  jsPrintString(s, strlen(s));
}

void WASMLogging::println() {
  jsPrintlnString("", 0);
}

void WASMLogging::println(const char s) {
  jsPrintlnChar(s);
}

void WASMLogging::println(const char *s) {
  jsPrintlnString(s, strlen(s));
}

// Platform implementation

uint32_t WASMPlatform::getLocalTime() {
  return jsGetRelativeTime();
}

uint32_t WASMPlatform::getClockOffset() {
  return this->clockOffset;
}
void WASMPlatform::setClockOffset(uint32_t newOffset) {
  this->clockOffset = newOffset;
}

// TODO: pull into base class
void WASMPlatform::setDeviceMode(RVLDeviceMode newDeviceMode) {
  this->deviceMode = newDeviceMode;
}

RVLDeviceMode WASMPlatform::getDeviceMode() {
  return this->deviceMode;
}

uint16_t WASMPlatform::getDeviceId() {
  return jsGetDeviceId();
}

RVLWaveSettings* WASMPlatform::getWaveSettings() {
  return &waveSettings;
}

void WASMPlatform::setWaveSettings(RVLWaveSettings* newWaveSettings) {
  // TODO: expose to JS
  memcpy(&(this->waveSettings), newWaveSettings, sizeof(RVLWaveSettings));
}

}  // namespace WASMPlatform
