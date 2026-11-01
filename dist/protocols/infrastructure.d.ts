import { type AppendBuffer } from '../buffer.ts';
import { type NodeStatus } from '../types.ts';
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
} | {
    type: 'status';
    source: number;
    status: NodeStatus;
};
export declare function writeInfrastructureHeader(packet: AppendBuffer, source: number, packetType: number, destination: number): void;
export declare function decodeInfrastructurePacket(message: Buffer, ownId: number | undefined): InfrastructureMessage | undefined;
export {};
