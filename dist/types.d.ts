export type RVLInitOptions = {
    networkInterface?: string;
};
export type AnimationColorParameters = {
    a: number;
    b: number;
    w_t: number;
    w_x: number;
    phi: number;
};
export type AnimationLayer = {
    h: AnimationColorParameters;
    s: AnimationColorParameters;
    v: AnimationColorParameters;
    a: AnimationColorParameters;
};
export type AnimationParameters = {
    timePeriod?: number;
    distancePeriod?: number;
    animations: AnimationLayer[];
};
export type SceneOptions = {
    startFrame?: number;
    fadeFrames?: number;
};
export type ColorOrder = 'RGB' | 'RBG' | 'GRB' | 'GBR' | 'BRG' | 'BGR';
export type NodeConfiguration = {
    channel: number;
    brightness: number;
    pixelCount: number;
    colorOrder: ColorOrder;
    statusLedBrightness: number;
    nickname: string;
};
export type NodeCapabilities = {
    [P in keyof NodeConfiguration]: boolean;
};
export type NodeStatus = NodeConfiguration & {
    deviceId: number;
    capabilities: NodeCapabilities;
    mode: 'controller' | 'receiver';
};
