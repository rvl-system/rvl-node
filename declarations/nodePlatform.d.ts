/// <reference types="node" />
export declare function addPacketToQueue(packet: Buffer): void;
export declare function endWrite(destination: number, bufferPointer: number, length: number): void;
export declare function parsePacket(bufferPointer: number): number;
export declare function print(messagePointer: number): void;
export declare function println(messagePointer: number): void;
