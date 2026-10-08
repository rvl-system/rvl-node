import { AppendBuffer, checkRange } from '../buffer.ts';
import {
  getAnimationClock,
  getAnimationFrame,
  isClockSynchronized,
  subscribeToClockSteps,
  toAnimationClock,
  waitForClockSync,
} from '../clock.ts';
import {
  DEFAULT_FADE_FRAMES,
  FRAME_PERIOD,
  MIN_FADE_FRAMES,
  PACKET_TYPE_OFF,
  PACKET_TYPE_PARAMETRIC_ANIMATION,
  REPEAT_SEND_FRAMES,
  RVLA_PORT,
  RVLA_SIGNATURE,
  RVLA_VERSION,
} from '../config.ts';
import { createEmptyAnimation } from '../parametric.ts';
import { ChannelScenes, type Scene, type SceneContent } from '../scenes.ts';
import { assertInitialized, send } from '../transport.ts';
import { type AnimationParameters, type SceneOptions } from '../types.ts';
import { getDeviceId } from './identity.ts';

const DEFAULT_TIME_PERIOD = 255;
const DEFAULT_DISTANCE_PERIOD = 32;
const MAX_NUM_LAYERS = 4;
const NUM_CHANNELS = 8;
const MAX_FADE_FRAMES = 0xff;
// Unmasked, as the firmware's sender writes its sums
const MAX_START_FRAME = 0xffffffff;

// Half the boards' 2 s: rvl-node isn't power-constrained
const RESEND_INTERVAL = 1000;
const CLOCK_WARNING_INTERVAL = 10000;

type ChannelState = {
  scenes: ChannelScenes;
  // Local time, which a clock step can't move
  nextSendTime: number;
  isRepeatDue: boolean;
  sendsInFlight: number;
  waitingCalls: (() => void)[];
};

// A channel nothing has scheduled on sends nothing
const channels: ChannelState[] = Array.from({ length: NUM_CHANNELS }, () => ({
  scenes: new ChannelScenes(),
  nextSendTime: 0,
  isRepeatDue: false,
  sendsInFlight: 0,
  waitingCalls: [],
}));
let lastClockWarningTime: number | undefined;

function validateChannel(channel: number): void {
  if (!Number.isInteger(channel) || channel < 0 || channel >= NUM_CHANNELS) {
    throw new Error(
      `Channel must be an integer between 0 and ${NUM_CHANNELS - 1}`
    );
  }
}

function validateSceneOptions({ startFrame, fadeFrames }: SceneOptions): void {
  if (
    startFrame !== undefined &&
    (!Number.isInteger(startFrame) ||
      startFrame < 0 ||
      startFrame > MAX_START_FRAME)
  ) {
    throw new Error(
      `startFrame must be an integer between 0 and ${MAX_START_FRAME}, got ${startFrame}`
    );
  }
  if (
    fadeFrames !== undefined &&
    (!Number.isInteger(fadeFrames) ||
      fadeFrames < MIN_FADE_FRAMES ||
      fadeFrames > MAX_FADE_FRAMES)
  ) {
    throw new Error(
      `fadeFrames must be an integer between ${MIN_FADE_FRAMES} and ${MAX_FADE_FRAMES}, got ${fadeFrames}`
    );
  }
}

function encodeParametricSettings(parameters: AnimationParameters): Buffer {
  const {
    timePeriod = DEFAULT_TIME_PERIOD,
    distancePeriod = DEFAULT_DISTANCE_PERIOD,
    animations,
  } = parameters;
  if (animations.length > MAX_NUM_LAYERS) {
    throw new Error(`Only ${MAX_NUM_LAYERS} layers max are supported`);
  }
  // The firmware divides by both, and drops a packet where either is 0
  checkRange(timePeriod, 1, 0xff);
  checkRange(distancePeriod, 1, 0xff);

  const settings = new AppendBuffer();
  settings.append8(timePeriod);
  settings.append8(distancePeriod);
  for (let i = 0; i < MAX_NUM_LAYERS; i++) {
    const layer = animations[i] ?? createEmptyAnimation();
    for (const color of [layer.h, layer.s, layer.v, layer.a]) {
      settings.append8(color.a);
      settings.append8(color.b);
      settings.appendInt8(color.w_t);
      settings.appendInt8(color.w_x);
      settings.appendInt8(color.phi);
    }
  }
  return settings.toBuffer();
}

function writeScenePacket(
  deviceId: number,
  channel: number,
  { start, fade, content }: Scene
): AppendBuffer {
  const packet = new AppendBuffer();
  packet.appendString(RVLA_SIGNATURE);
  packet.append8(RVLA_VERSION);
  packet.append8(deviceId);
  packet.append8(
    content.type === 'off' ? PACKET_TYPE_OFF : PACKET_TYPE_PARAMETRIC_ANIMATION
  );
  packet.append8(channel);
  packet.append8(0); // Reserved
  packet.append32(start);
  packet.append8(0); // Reserved
  packet.append8(fade);
  if (content.type === 'parametric') {
    packet.appendBytes(content.settings);
  }
  return packet;
}

// Settled once no request is held and the last scheduled scene's repeat is on
// the wire, so a caller that exits on the promise can't leave a board that
// lost the first copy without the second
function resolveCallsIfSettled(state: ChannelState): void {
  if (
    state.scenes.isHoldingRequest() ||
    state.isRepeatDue ||
    state.sendsInFlight > 0
  ) {
    return;
  }
  for (const resolve of state.waitingCalls) {
    resolve();
  }
  state.waitingCalls = [];
}

// Current, then pending, one packet each, as the firmware's sync() sends them
function sendCurrentAndPendingScenes(
  channel: number,
  state: ChannelState
): void {
  const deviceId = getDeviceId();
  // Dropped while there's no ID, and counted as sent: that can last a while,
  // and the ID client already warns about it
  if (deviceId !== undefined) {
    for (const scene of [
      state.scenes.getCurrentScene(),
      state.scenes.getPendingScene(),
    ]) {
      if (!scene) {
        continue;
      }
      state.sendsInFlight++;
      void send(writeScenePacket(deviceId, channel, scene), RVLA_PORT).then(
        () => {
          state.sendsInFlight--;
          resolveCallsIfSettled(state);
        }
      );
    }
  }
  resolveCallsIfSettled(state);
}

// At once, and again on the frame boundary REPEAT_SEND_FRAMES on, so the two
// copies ride different DTIM bursts
function sendNewScene(channel: number, state: ChannelState): void {
  // One local read, so the two clocks can't straddle a millisecond
  const now = performance.now();
  state.nextSendTime =
    now +
    REPEAT_SEND_FRAMES * FRAME_PERIOD -
    (toAnimationClock(now) % FRAME_PERIOD);
  state.isRepeatDue = true;
  sendCurrentAndPendingScenes(channel, state);
}

function warnClockUnsynchronized(): void {
  const now = performance.now();
  if (
    lastClockWarningTime !== undefined &&
    now - lastClockWarningTime < CLOCK_WARNING_INTERVAL
  ) {
    return;
  }
  lastClockWarningTime = now;
  console.warn(
    'The fleet clock has not synchronized yet, so scenes are held until it ' +
      'does. Is the coordinator running?'
  );
}

function scheduleOrHoldContent(
  channel: number,
  content: SceneContent,
  { startFrame, fadeFrames = DEFAULT_FADE_FRAMES }: SceneOptions
): Promise<void> {
  const state = channels[channel];
  if (!isClockSynchronized()) {
    if (startFrame !== undefined) {
      throw new Error(
        'startFrame needs the fleet clock, which has not synchronized yet. ' +
          'Wait for the connected event'
      );
    }
    state.scenes.holdRequest({ fade: fadeFrames, content });
    warnClockUnsynchronized();
    return Promise.resolve();
  }

  const frame = getAnimationFrame();
  if (startFrame === undefined) {
    if (state.scenes.requestScene({ fade: fadeFrames, content }, frame)) {
      sendNewScene(channel, state);
    }
  } else {
    state.scenes.scheduleSceneAt(
      { start: startFrame, fade: fadeFrames, content },
      frame
    );
    sendNewScene(channel, state);
  }
  return new Promise((resolve) => {
    state.waitingCalls.push(resolve);
    resolveCallsIfSettled(state);
  });
}

// The public sends validate synchronously and return a promise rather than
// being async, so a bad argument throws at the call site
export function setAnimationParameters(
  channel: number,
  parameters: AnimationParameters,
  options: SceneOptions = {}
): Promise<void> {
  assertInitialized();
  validateChannel(channel);
  validateSceneOptions(options);
  const settings = encodeParametricSettings(parameters);
  return scheduleOrHoldContent(
    channel,
    { type: 'parametric', settings },
    options
  );
}

export function setOff(
  channel: number,
  options: SceneOptions = {}
): Promise<void> {
  assertInitialized();
  validateChannel(channel);
  validateSceneOptions(options);
  return scheduleOrHoldContent(channel, { type: 'off' }, options);
}

export function getEarliestStartFrame(channel: number): number | undefined {
  assertInitialized();
  validateChannel(channel);
  return channels[channel].scenes.getEarliestStartFrame(getAnimationFrame());
}

// A millisecond past the next frame boundary, like the boards' loops, so the
// tick lands inside the frame it reads
function scheduleFrameTick(): void {
  const delay = FRAME_PERIOD - (getAnimationClock() % FRAME_PERIOD) + 1;
  setTimeout(runFrameTick, delay);
}

function runFrameTick(): void {
  const frame = getAnimationFrame();
  const now = performance.now();
  for (const [channel, state] of channels.entries()) {
    if (state.scenes.advanceToFrame(frame)) {
      sendNewScene(channel, state);
    } else if (now >= state.nextSendTime) {
      state.nextSendTime = now + RESEND_INTERVAL;
      state.isRepeatDue = false;
      sendCurrentAndPendingScenes(channel, state);
    }
  }
  scheduleFrameTick();
}

function onClockStep(shift: number, frame: number): void {
  for (const [channel, state] of channels.entries()) {
    if (state.scenes.onClockStep(shift, frame)) {
      sendNewScene(channel, state);
    }
  }
}

// Nothing is scheduled before the first sync, so the first tick releases what
// was held through the gate
export function startAnimationProtocol(): void {
  subscribeToClockSteps(onClockStep);
  void waitForClockSync().then(runFrameTick);
}
