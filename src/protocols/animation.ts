import { AppendBuffer, checkRange } from '../buffer.ts';
import {
  PACKET_TYPE_OFF,
  PACKET_TYPE_PARAMETRIC_ANIMATION,
  RVLA_PORT,
  RVLA_SIGNATURE,
  RVLA_VERSION,
} from '../config.ts';
import { createEmptyAnimation } from '../parametric.ts';
import { assertInitialized, send } from '../transport.ts';
import { type AnimationParameters } from '../types.ts';
import { getDeviceId, on } from './identity.ts';

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_LAYERS = 4;
const NUM_CHANNELS = 8;

const ANIMATION_RESEND_INTERVAL = 1000;

type ChannelAnimation = {
  packetType: number;
  payload: AppendBuffer;
};

// Headers are written at send time, so re-sends carry the current ID
const channelAnimations = new Map<number, ChannelAnimation>();

function validateChannel(channel: number): void {
  if (!Number.isInteger(channel) || channel < 0 || channel >= NUM_CHANNELS) {
    throw new Error(
      `Channel must be an integer between 0 and ${NUM_CHANNELS - 1}`
    );
  }
}

// The public sends validate synchronously and return a promise rather than
// being async, so a bad argument throws at the call site
export function setAnimationParameters(
  channel: number,
  parameters: AnimationParameters
): Promise<void> {
  assertInitialized();
  validateChannel(channel);
  if (parameters.animations.length > MAX_NUM_LAYERS) {
    throw new Error(`Only ${MAX_NUM_LAYERS} layers max are supported`);
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
  for (let i = 0; i < MAX_NUM_LAYERS; i++) {
    const layer = parameters.animations[i] ?? createEmptyAnimation();
    for (const color of [layer.h, layer.s, layer.v, layer.a]) {
      payload.append8(color.a);
      payload.append8(color.b);
      payload.appendInt8(color.w_t);
      payload.appendInt8(color.w_x);
      payload.appendInt8(color.phi);
    }
  }

  channelAnimations.set(channel, {
    packetType: PACKET_TYPE_PARAMETRIC_ANIMATION,
    payload,
  });
  return sendAnimation(channel);
}

export function setOff(channel: number): Promise<void> {
  assertInitialized();
  validateChannel(channel);
  channelAnimations.set(channel, {
    packetType: PACKET_TYPE_OFF,
    payload: new AppendBuffer(),
  });
  return sendAnimation(channel);
}

// A new ID re-sends every channel at once, so nothing waits out the interval
export function startAnimationProtocol(): void {
  setInterval(sendAllAnimations, ANIMATION_RESEND_INTERVAL);
  on('connected', sendAllAnimations);
}

function sendAnimation(channel: number): Promise<void> {
  const animation = channelAnimations.get(channel);
  const deviceId = getDeviceId();
  // Dropped silently while there's no ID: that can last a while, and the ID
  // client already warns about it
  if (!animation || deviceId === undefined) {
    return Promise.resolve();
  }

  const packet = new AppendBuffer();
  packet.appendString(RVLA_SIGNATURE);
  packet.append8(RVLA_VERSION);
  packet.append8(deviceId);
  packet.append8(animation.packetType);
  packet.append8(channel);
  packet.append8(0); // Reserved
  packet.appendBuffer(animation.payload);
  return send(packet, RVLA_PORT);
}

function sendAllAnimations(): void {
  for (const channel of channelAnimations.keys()) {
    void sendAnimation(channel);
  }
}
