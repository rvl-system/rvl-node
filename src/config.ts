// These mirror src/rvl/config.hpp in rvl (github.com/rvl-system/rvl), in its
// order
export const FRAME_PERIOD = 32;

export const MIN_FADE_FRAMES = 16;
export const DEFAULT_FADE_FRAMES = 32;
export const SCENE_LEAD_FRAMES = 5;
export const REPEAT_SEND_FRAMES = 4;
export const SCENE_MAX_AGE_FRAMES = 2700000;

export const RVLA_VERSION = 2;
export const RVLI_VERSION = 1;

export const NUM_DEVICE_IDS = 240;
export const UNASSIGNED_DEVICE_ID = 255;

export const RVLA_PORT = 4978;
export const RVLI_PORT = 4979;

export const PACKET_TYPE_OFF = 1;
export const PACKET_TYPE_PARAMETRIC_ANIMATION = 4;

export const RVLI_PACKET_TYPE_ID_ASSIGNMENT = 1;
export const RVLI_PACKET_TYPE_CLOCK_SYNC = 2;

export const ID_REQUEST_TYPE = 1;
export const ID_REPLY_TYPE = 2;

export const NUM_OBSERVATIONS_IN_SET = 3;

export const RVLA_SIGNATURE = 'RVLA';
export const RVLI_SIGNATURE = 'RVLI';
