import { createSocket, type Socket } from 'node:dgram';
import { EventEmitter } from 'node:events';
import { networkInterfaces } from 'node:os';

import { createEmptyAnimation } from './animation.js';
import {
  getAvailableInterfaces,
  getDefaultInterface,
  isUsableAddress,
} from './net.js';
import { type AnimationParameters, type RVLManagerOptions } from './types.js';

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_WAVES = 4;
const NUM_CHANNELS = 8;

// These mirror src/rvl/config.hpp in rvl (github.com/rvl-system/rvl)
const RVLA_PORT = 4978;
const RVLI_PORT = 4979;
const PROTOCOL_VERSION = 1;
const NUM_DEVICE_IDS = 240;
const UNASSIGNED_DEVICE_ID = 255;

const RVLA_SIGNATURE = 'RVLA';
const PACKET_TYPE_OFF = 1;
const PACKET_TYPE_WAVE_ANIMATION = 4;

const RVLI_SIGNATURE = 'RVLI';
const RVLI_PACKET_TYPE_ID_ASSIGNMENT = 1;
const ID_REQUEST_TYPE = 1;
const ID_REPLY_TYPE = 2;

const ANIMATION_RESEND_INTERVAL = 1000;
const IDENTITY_LOOP_INTERVAL = 250;
const ID_RETRY_INTERVAL = 1000;
const ID_RETRY_JITTER = 250;
const ID_WARNING_INTERVAL = 10000;

// Private and friend class properties
export const initManager = Symbol();

function checkRange(value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Expected an integer from ${min} to ${max}, got ${value}`);
  }
}

// Big-endian, like the firmware's read16() and read32()
class AppendBuffer {
  protected bytes: number[] = [];

  append8(value: number) {
    checkRange(value, 0, 0xff);
    this.bytes.push(value);
  }

  appendInt8(value: number) {
    checkRange(value, -0x80, 0x7f);
    this.bytes.push(value & 0xff);
  }

  append16(value: number) {
    checkRange(value, 0, 0xffff);
    this.bytes.push((value >>> 8) & 0xff, value & 0xff);
  }

  append32(value: number) {
    checkRange(value, 0, 0xffffffff);
    this.bytes.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff
    );
  }

  appendString(value: string) {
    for (let i = 0; i < value.length; i++) {
      this.bytes.push(value.charCodeAt(i));
    }
  }

  appendBuffer(other: AppendBuffer): void {
    this.bytes.push(...other.bytes);
  }

  toBuffer(): Buffer {
    return Buffer.from(this.bytes);
  }
}

type ChannelAnimation = {
  packetType: number;
  payload: AppendBuffer;
};

type InterfaceAddress = {
  address: string;
  netmask: string;
};

function getBroadcastAddress({ address, netmask }: InterfaceAddress): string {
  const netmaskOctets = netmask.split('.').map(Number);
  return address
    .split('.')
    .map((octet, i) => Number(octet) | (~netmaskOctets[i] & 0xff))
    .join('.');
}

type RVLManagerEvents = {
  connected: [];
  disconnected: [];
};

export class RVLManager extends EventEmitter<RVLManagerEvents> {
  #socket: Socket;

  #networkInterface: string;
  #deviceId: number | undefined;

  // Headers are written at send time, so re-sends carry the current ID
  #channelAnimations = new Map<number, ChannelAnimation>();

  #nextIdRequestTime = 0;
  #idRequested = false;
  #lastIdRequestTime = 0;
  #lastIdWarningTime = 0;

  get networkInterface() {
    return this.#networkInterface;
  }

  get deviceId() {
    return this.#deviceId;
  }

  // The ID is only ever held while the interface has an address, so this
  // matches the firmware's isConnected()
  get connected() {
    return this.#deviceId !== undefined;
  }

  constructor({ networkInterface }: RVLManagerOptions = {}) {
    super();
    if (!networkInterface) {
      networkInterface = getDefaultInterface();
      if (!networkInterface) {
        throw new Error(
          'Could not determine a usable default network interface'
        );
      }
    }
    this.#networkInterface = networkInterface;
    this.#socket = createSocket({ type: 'udp4' });
  }

  public [initManager](): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.#socket;
      let listening = false;

      // Before listening, an error is a failed bind that nothing retries
      socket.on('error', (err) => {
        if (listening) {
          console.error(err);
        } else {
          socket.close();
          reject(err);
        }
      });

      socket.on('message', (message) => {
        this.#handleMessage(message);
      });

      socket.on('listening', () => {
        listening = true;
        socket.setBroadcast(true);

        setInterval(() => {
          this.#sendAllAnimations();
        }, ANIMATION_RESEND_INTERVAL);

        const now = performance.now();
        this.#nextIdRequestTime = now;
        this.#lastIdWarningTime = now;
        this.#identityLoop();
        setInterval(() => {
          this.#identityLoop();
        }, IDENTITY_LOOP_INTERVAL);

        resolve();
      });

      // Every address on an ephemeral port: each send's subnet broadcast is
      // what picks the interface, and the coordinator replies to this port
      socket.bind();
    });
  }

  // The public sends validate synchronously and return a promise rather than
  // being async, so a bad argument throws at the call site
  public setAnimationParameters(
    channel: number,
    parameters: AnimationParameters
  ): Promise<void> {
    this.#validateChannel(channel);
    if (parameters.animations.length > MAX_NUM_WAVES) {
      throw new Error(`Only ${MAX_NUM_WAVES} waves max are supported`);
    }
    if (typeof parameters.timePeriod !== 'number') {
      parameters.timePeriod = DEFAULT_TIME_PERIOD;
    }
    if (typeof parameters.distancePeriod !== 'number') {
      parameters.distancePeriod = DEFAULT_DISTANCE_PERIOD;
    }
    // The firmware divides by both, and drops a packet where either is 0
    checkRange(parameters.timePeriod, 1, 0xff);
    checkRange(parameters.distancePeriod, 1, 0xff);

    const payload = new AppendBuffer();
    payload.append8(parameters.timePeriod);
    payload.append8(parameters.distancePeriod);
    for (let i = 0; i < MAX_NUM_WAVES; i++) {
      const layer = parameters.animations[i] ?? createEmptyAnimation();
      for (const color of [layer.h, layer.s, layer.v, layer.a]) {
        payload.append8(color.a);
        payload.append8(color.b);
        payload.appendInt8(color.w_t);
        payload.appendInt8(color.w_x);
        payload.appendInt8(color.phi);
      }
    }

    this.#channelAnimations.set(channel, {
      packetType: PACKET_TYPE_WAVE_ANIMATION,
      payload,
    });
    return this.#sendAnimation(channel);
  }

  public setOff(channel: number): Promise<void> {
    this.#validateChannel(channel);
    this.#channelAnimations.set(channel, {
      packetType: PACKET_TYPE_OFF,
      payload: new AppendBuffer(),
    });
    return this.#sendAnimation(channel);
  }

  #sendAnimation(channel: number): Promise<void> {
    const animation = this.#channelAnimations.get(channel);
    const deviceId = this.#deviceId;
    // Dropped silently while there's no ID: that can last a while, and the ID
    // client already warns about it
    if (!animation || deviceId === undefined) {
      return Promise.resolve();
    }

    const packet = new AppendBuffer();
    packet.appendString(RVLA_SIGNATURE);
    packet.append8(PROTOCOL_VERSION);
    packet.append8(deviceId);
    packet.append8(animation.packetType);
    packet.append8(channel);
    packet.append8(0); // Reserved
    packet.appendBuffer(animation.payload);
    return this.#send(packet, RVLA_PORT);
  }

  #sendAllAnimations() {
    for (const channel of this.#channelAnimations.keys()) {
      void this.#sendAnimation(channel);
    }
  }

  // A port of the firmware's ProtocolIdentity::loop(), with the interface
  // having an IPv4 address standing in for the transport's link state. Only
  // whether it has one matters, never which one
  #identityLoop() {
    const now = performance.now();
    const interfaceAddress = this.#getInterfaceAddress();
    if (!interfaceAddress) {
      if (this.#deviceId !== undefined) {
        this.#deviceId = undefined;
        this.#lastIdWarningTime = now;
        this.emit('disconnected');
      }
      this.#nextIdRequestTime = now;
      this.#idRequested = false;
    } else if (this.#deviceId === undefined && now >= this.#nextIdRequestTime) {
      if (!this.#idRequested) {
        console.info('Requesting device ID');
        this.#idRequested = true;
      }
      this.#lastIdRequestTime = now;
      this.#sendIdRequest();
      this.#nextIdRequestTime =
        now + ID_RETRY_INTERVAL + Math.random() * ID_RETRY_JITTER;
    }

    if (
      this.#deviceId === undefined &&
      now - this.#lastIdWarningTime >= ID_WARNING_INTERVAL
    ) {
      this.#lastIdWarningTime = now;
      if (interfaceAddress) {
        console.warn(
          `No device ID from the coordinator yet. Is ${this.#networkInterface} ` +
            `(${interfaceAddress.address}) on the fleet's network?`
        );
      } else {
        console.warn(
          `Waiting for ${this.#networkInterface} to get an IPv4 address. ` +
            `Available interfaces: ${getAvailableInterfaces().join(', ')}`
        );
      }
    }
  }

  #sendIdRequest() {
    const packet = new AppendBuffer();
    packet.appendString(RVLI_SIGNATURE);
    packet.append8(PROTOCOL_VERSION);
    packet.append8(UNASSIGNED_DEVICE_ID);
    packet.append8(RVLI_PACKET_TYPE_ID_ASSIGNMENT);
    packet.append8(0); // Reserved
    packet.append8(ID_REQUEST_TYPE);
    void this.#send(packet, RVLI_PORT);
  }

  #handleMessage(message: Buffer) {
    if (
      message.length < 10 ||
      message.toString('latin1', 0, 4) !== RVLI_SIGNATURE ||
      message[4] !== PROTOCOL_VERSION ||
      message[5] >= NUM_DEVICE_IDS ||
      message[6] !== RVLI_PACKET_TYPE_ID_ASSIGNMENT ||
      message[8] !== ID_REPLY_TYPE
    ) {
      return;
    }
    const id = message[9];
    if (id >= NUM_DEVICE_IDS) {
      return;
    }

    if (id === this.#deviceId) {
      return;
    }
    const roundTrip = performance.now() - this.#lastIdRequestTime;
    console.info(
      `Assigned device ID ${id}, ${roundTrip.toFixed(1)} ms after the request`
    );
    const wasConnected = this.connected;
    this.#deviceId = id;
    this.#sendAllAnimations();
    if (!wasConnected) {
      this.emit('connected');
    }
  }

  // Never rejects, so callers can drop the promise
  #send(packet: AppendBuffer, port: number): Promise<void> {
    const interfaceAddress = this.#getInterfaceAddress();
    if (!interfaceAddress) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#socket.send(
        packet.toBuffer(),
        port,
        getBroadcastAddress(interfaceAddress),
        (err) => {
          if (err) {
            console.error(err);
          }
          resolve();
        }
      );
    });
  }

  #getInterfaceAddress(): InterfaceAddress | undefined {
    const bindings = networkInterfaces()[this.#networkInterface] ?? [];
    const binding = bindings.find(isUsableAddress);
    if (!binding) {
      return undefined;
    }
    return { address: binding.address, netmask: binding.netmask };
  }

  #validateChannel(channel: number): void {
    if (!Number.isInteger(channel) || channel < 0 || channel >= NUM_CHANNELS) {
      throw new Error(
        `Channel must be an integer between 0 and ${NUM_CHANNELS - 1}`
      );
    }
  }
}
