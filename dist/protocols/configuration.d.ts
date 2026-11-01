import { type NodeConfiguration, type NodeStatus } from '../types.ts';
export declare function handleStatus(status: NodeStatus): void;
export declare function getNodes(): Promise<NodeStatus[]>;
export declare function configureNode<P extends keyof NodeConfiguration>(deviceId: number, property: P, value: NodeConfiguration[P]): Promise<NodeStatus>;
export declare function identifyNode(deviceId: number): Promise<NodeStatus>;
