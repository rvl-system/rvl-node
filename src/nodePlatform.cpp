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

#include <chrono>
#include <emscripten.h>
#include <string.h>
#include <rvl.hpp>
#include <stdio.h>
#include "./nodePlatform.h"

namespace NodePlatform {

// This is the maximum "safe" buffer size for a UDP packet that doesn't fragment
#define PACKET_BUFFER_SIZE 512

auto startTime = std::chrono::high_resolution_clock::now().time_since_epoch();
uint8_t deviceId = 0;

uint8_t receiveBuffer[PACKET_BUFFER_SIZE];
uint16_t receiveBufferPointer;

uint8_t sendBuffer[PACKET_BUFFER_SIZE];
uint16_t sendBufferPointer;
uint8_t sendDestination;

System::System(uint8_t newDeviceId) {
  deviceId = newDeviceId;
  this->setConnectedState(true);
}

void System::loop() {}

void System::beginWrite(uint8_t destination) {
  sendBufferPointer = 0;
  sendDestination = destination;
}

void System::write8(uint8_t data) {
  sendBuffer[sendBufferPointer++] = data;
}

void System::write16(uint16_t data) {
  sendBuffer[sendBufferPointer++] = data >> 8;
  sendBuffer[sendBufferPointer++] = data & 0xFF;
}

void System::write32(uint32_t data) {
  sendBuffer[sendBufferPointer++] = data >> 24;
  sendBuffer[sendBufferPointer++] = data >> 16 & 0xFF;
  sendBuffer[sendBufferPointer++] = data >> 8 & 0xFF;
  sendBuffer[sendBufferPointer++] = data & 0xFF;
}

void System::write(uint8_t* data, uint16_t length) {
  for (uint8_t i = 0; i < length; i++) {
    sendBuffer[sendBufferPointer++] = data[i];
  }
}

extern "C" { extern void jsEndWrite(uint8_t destination, uint8_t* buffer, uint8_t length); }
void System::endWrite() {
  jsEndWrite(sendDestination, sendBuffer, sendBufferPointer);
}

extern "C" { extern uint16_t jsParsePacket(uint8_t* buffer); }
uint16_t System::parsePacket() {
  receiveBufferPointer = 0;
  return jsParsePacket(receiveBuffer);
}

uint8_t System::read8() {
  return receiveBuffer[receiveBufferPointer++];

}

uint16_t System::read16() {
  uint16_t value = 0;
  value |= receiveBuffer[receiveBufferPointer++] << 8;
  value |= receiveBuffer[receiveBufferPointer++];
  return value;
}

uint32_t System::read32() {
  uint32_t value = 0;
  value |= receiveBuffer[receiveBufferPointer++] << 24;
  value |= receiveBuffer[receiveBufferPointer++] << 16;
  value |= receiveBuffer[receiveBufferPointer++] << 8;
  value |= receiveBuffer[receiveBufferPointer++];
  return value;
}

void System::read(uint8_t* buffer, uint16_t length) {
  for (uint16_t i = 0; i < length; i++) {
    buffer[i] = receiveBuffer[receiveBufferPointer++];
  }
}

void System::endRead() {
  // Do nothing. This method is required on other platforms.
}

uint16_t System::getDeviceId() {
  return deviceId;
}

uint32_t System::localClock() {
  auto duration = std::chrono::high_resolution_clock::now().time_since_epoch() - startTime;
  return duration.count() / 1000000;
}

void System::print(const char* str) {
  printf("%s", str);
}

void System::println(const char* str) {
  printf("%s\n", str);
}

}  // namespace NodePlatform
