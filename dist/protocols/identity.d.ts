type IdentityEvents = {
    connected: [];
    disconnected: [];
};
export declare function getDeviceId(): number | undefined;
export declare function isConnected(): boolean;
export declare function on(event: keyof IdentityEvents, listener: () => void): void;
export declare function startIdentityProtocol(): void;
export declare function handleIdReply(id: number): void;
export {};
