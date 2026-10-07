import { subtractFrames } from './clock.ts';
import { SCENE_LEAD_FRAMES, SCENE_MAX_AGE_FRAMES } from './config.ts';

export type SceneContent =
  { type: 'off' } | { type: 'parametric'; settings: Buffer };

// What a channel shows from its start frame on, dissolving over its fade from
// whatever was showing. Never changed once scheduled
export type Scene = {
  start: number;
  fade: number;
  content: SceneContent;
};

// A change the gate is holding. Unlike a board's, it keeps the fade it was
// asked for
type SceneRequest = {
  fade: number;
  content: SceneContent;
};

function isSameContent(a: SceneContent, b: SceneContent): boolean {
  if (a.type === 'off' || b.type === 'off') {
    return a.type === b.type;
  }
  return a.settings.equals(b.settings);
}

// Sums wrap at 2^32, as the firmware's uint32_t frame numbers do
function addFrames(frame: number, count: number): number {
  return (frame + count) >>> 0;
}

// The sender's half of the firmware's scenes.cpp, for one channel. A channel
// shows nothing until its first scene, where a board starts on its boot scene.
// The methods that can schedule a scene return whether they did, where
// scenes.cpp emits EVENT_ANIMATION_UPDATED
export class ChannelScenes {
  #current: Scene | undefined;
  #pending: Scene | undefined;
  #requested: SceneRequest | undefined;
  // Every board dissolves into current over [fadeStart, fadeEnd)
  #fadeStart = 0;
  #fadeEnd = 0;

  getCurrentScene(): Scene | undefined {
    return this.#current;
  }

  getPendingScene(): Scene | undefined {
    return this.#pending;
  }

  isHoldingRequest(): boolean {
    return this.#requested !== undefined;
  }

  // Before the first sync there is no frame to schedule on, so the latest
  // request waits for the first tick after it
  holdRequest(request: SceneRequest): void {
    this.#requested = request;
  }

  // The gate: content already scheduled is dropped, and anything else waits
  // for the last scheduled scene to finish fading
  requestScene(request: SceneRequest, currentFrame: number): boolean {
    this.#promoteDueSceneAndEmptyWindow(currentFrame);
    const target = this.#pending ?? this.#current;
    if (target && isSameContent(request.content, target.content)) {
      this.#requested = undefined;
      return false;
    }
    if (this.#pending || this.#isFading(currentFrame)) {
      this.#requested = request;
      return false;
    }
    this.#requested = undefined;
    this.#scheduleNextScene(currentFrame, request);
    return true;
  }

  scheduleSceneAt(scene: Scene, currentFrame: number): void {
    const earliest = this.getEarliestStartFrame(currentFrame);
    if (earliest === undefined) {
      throw new Error(
        'A scene is already scheduled ahead on this channel. Wait for it to start'
      );
    }
    if (subtractFrames(scene.start, earliest) < 0) {
      throw new Error(
        `Start frame ${scene.start} is before the earliest this channel can take, frame ${earliest}`
      );
    }
    this.#pending = scene;
  }

  // The later of the lead from now and the running fade's end, or undefined
  // while a scene the caller asked for is ahead
  getEarliestStartFrame(currentFrame: number): number | undefined {
    this.#promoteDueSceneAndEmptyWindow(currentFrame);
    if (this.#requested || (this.#pending && !this.#isPendingRekey())) {
      return undefined;
    }
    return this.#computeNextStart(currentFrame);
  }

  // Every condition is a level, not an edge, so a late tick still acts on it
  advanceToFrame(currentFrame: number): boolean {
    this.#promoteDueSceneAndEmptyWindow(currentFrame);
    if (this.#pending || this.#isFading(currentFrame)) {
      return false;
    }
    if (this.#requested) {
      const request = this.#requested;
      this.#requested = undefined;
      this.#scheduleNextScene(currentFrame, request);
      return true;
    }
    // Only the sender knows a scene's age, and past 2^26 frames a receiver
    // would read its start as the future
    if (
      this.#current &&
      subtractFrames(currentFrame, this.#current.start) > SCENE_MAX_AGE_FRAMES
    ) {
      this.#scheduleNextScene(currentFrame, this.#current);
      return true;
    }
    return false;
  }

  // Must not promote first: pending's start is in the old clock's frames. The
  // fade is re-based, as every board re-bases its own
  onClockStep(shift: number, currentFrame: number): boolean {
    this.#fadeStart = addFrames(this.#fadeStart, shift);
    this.#fadeEnd = addFrames(this.#fadeEnd, shift);
    const newest = this.#requested ?? this.#pending ?? this.#current;
    this.#pending = undefined;
    this.#requested = undefined;
    if (!newest) {
      return false;
    }
    this.#scheduleNextScene(currentFrame, newest);
    return true;
  }

  #isFading(currentFrame: number): boolean {
    return (
      subtractFrames(currentFrame, this.#fadeStart) >= 0 &&
      subtractFrames(currentFrame, this.#fadeEnd) < 0
    );
  }

  // A re-key or a step's re-schedule of what is showing, which an explicit
  // scene replaces before any board makes it current
  #isPendingRekey(): boolean {
    return (
      this.#pending !== undefined &&
      this.#current !== undefined &&
      isSameContent(this.#pending.content, this.#current.content)
    );
  }

  #promoteDueSceneAndEmptyWindow(currentFrame: number): void {
    if (
      this.#pending &&
      subtractFrames(currentFrame, this.#pending.start) >= 0
    ) {
      const scene = this.#pending;
      this.#pending = undefined;
      // At the scene's own start: a late tick is this node's lateness, not the
      // fleet's
      this.#fadeStart = scene.start;
      this.#fadeEnd =
        this.#current && isSameContent(scene.content, this.#current.content)
          ? scene.start
          : addFrames(scene.start, scene.fade);
      this.#current = scene;
    }
    // An ended window is emptied, or it would read as fading again a full cycle
    // later
    if (
      this.#fadeStart !== this.#fadeEnd &&
      subtractFrames(currentFrame, this.#fadeEnd) >= 0
    ) {
      this.#fadeStart = this.#fadeEnd;
    }
  }

  #computeNextStart(currentFrame: number): number {
    const start = addFrames(currentFrame, SCENE_LEAD_FRAMES);
    if (
      this.#isFading(currentFrame) &&
      subtractFrames(this.#fadeEnd, start) > 0
    ) {
      return this.#fadeEnd;
    }
    return start;
  }

  #scheduleNextScene(
    currentFrame: number,
    { fade, content }: SceneRequest
  ): void {
    this.#pending = {
      start: this.#computeNextStart(currentFrame),
      fade,
      content,
    };
  }
}
