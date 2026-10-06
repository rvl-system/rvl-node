type InfrastructureMessage = {
    type: 'idReply';
    source: number;
    deviceId: number;
} | {
    type: 'reference';
    source: number;
    id: number;
    startOfSet: boolean;
} | {
    type: 'observation';
    source: number;
    id: number;
    observedTime: number;
};
export declare function decodeInfrastructurePacket(message: Buffer, ownId: number | undefined): InfrastructureMessage | undefined;
export {};
