export type SceneContent = {
    type: 'off';
} | {
    type: 'parametric';
    settings: Buffer;
};
export type Scene = {
    start: number;
    fade: number;
    content: SceneContent;
};
type SceneRequest = {
    fade: number;
    content: SceneContent;
};
export declare class ChannelScenes {
    #private;
    getCurrentScene(): Scene | undefined;
    getPendingScene(): Scene | undefined;
    isHoldingRequest(): boolean;
    holdRequest(request: SceneRequest): void;
    requestScene(request: SceneRequest, currentFrame: number): boolean;
    scheduleSceneAt(scene: Scene, currentFrame: number): void;
    getEarliestStartFrame(currentFrame: number): number | undefined;
    advanceToFrame(currentFrame: number): boolean;
    onClockStep(shift: number, currentFrame: number): boolean;
}
export {};
