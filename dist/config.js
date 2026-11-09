import {} from "./types.js";
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
// As an RVLI destination: every node
export const EVERY_DEVICE_ID = 255;
export const NUM_CHANNELS = 8;
export const RVLA_PORT = 4978;
export const RVLI_PORT = 4979;
export const PACKET_TYPE_OFF = 1;
export const PACKET_TYPE_PARAMETRIC_ANIMATION = 4;
export const RVLI_PACKET_TYPE_ID_ASSIGNMENT = 1;
export const RVLI_PACKET_TYPE_CLOCK_SYNC = 2;
export const RVLI_PACKET_TYPE_QUERY = 3;
export const RVLI_PACKET_TYPE_CONFIGURE = 4;
export const RVLI_PACKET_TYPE_IDENTIFY = 5;
export const RVLI_PACKET_TYPE_STATUS = 6;
export const ID_REQUEST_TYPE = 1;
export const ID_REPLY_TYPE = 2;
export const NICKNAME_LENGTH = 16;
export const NUM_OBSERVATIONS_IN_SET = 3;
export const RVLA_SIGNATURE = 'RVLA';
export const RVLI_SIGNATURE = 'RVLI';
// The properties and the color orders in wire order: a property's index is
// its byte in a configure and its bit in a capabilities byte, as rvl's
// Property and ColorOrder enums number them
export const PROPERTIES = [
    'channel',
    'brightness',
    'pixelCount',
    'colorOrder',
    'statusLedBrightness',
    'nickname',
    'currentLimit',
];
export const COLOR_ORDERS = [
    'RGB',
    'RBG',
    'GRB',
    'GBR',
    'BRG',
    'BGR',
];
// LED_MAX_PIXELS in rvl-firmware's src/config.hpp, the size of a board's
// strip buffers, kept in step by hand. Not on the wire: it is one constant
// across the fleet
export const MAX_PIXEL_COUNT = 300;
// The largest value the current limit's 16-bit field on the wire holds, in mA
export const MAX_CURRENT_LIMIT = 65535;
//# sourceMappingURL=config.js.map