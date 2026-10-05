type InfrastructureMessage = {
    type: 'idReply';
    deviceId: number;
};
export declare function decodeInfrastructurePacket(message: Buffer): InfrastructureMessage | undefined;
export {};
