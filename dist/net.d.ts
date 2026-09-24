import { type NetworkInterfaceInfo } from 'node:os';
export declare function isUsableAddress({ family, internal, address, }: NetworkInterfaceInfo): boolean;
export declare function getAvailableInterfaces(): string[];
export declare function getDefaultInterface(): string | undefined;
