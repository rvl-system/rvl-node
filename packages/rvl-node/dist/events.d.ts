export declare function on(event: 'connected' | 'disconnected', listener: () => void): void;
export declare function on(event: 'error', listener: (error: Error) => void): void;
export declare function emit(event: 'connected' | 'disconnected'): void;
export declare function emit(event: 'error', error: Error): void;
