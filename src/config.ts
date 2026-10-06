// These mirror src/rvl/config.hpp in rvl (github.com/rvl-system/rvl), in its
// order
export const FRAME_PERIOD = 32;

// The boards are on 2. This sender still writes version 1's format, which they
// drop, until it can schedule scenes
export const RVLA_VERSION = 1;
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
