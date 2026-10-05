import { type AppendBuffer } from './buffer.ts';
type InterfaceAddress = {
    address: string;
    netmask: string;
};
export declare function assertInitialized(): void;
export declare function getNetworkInterface(): string;
export declare function bindTransport(networkInterface: string, onMessage: (message: Buffer) => void): Promise<void>;
export declare function getInterfaceAddress(): InterfaceAddress | undefined;
export declare function send(packet: AppendBuffer, port: number): Promise<void>;
export {};
