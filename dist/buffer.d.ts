export declare function checkRange(value: number, min: number, max: number): void;
export declare class AppendBuffer {
    protected bytes: number[];
    append8(value: number): void;
    appendInt8(value: number): void;
    append16(value: number): void;
    append32(value: number): void;
    appendString(value: string): void;
    appendBytes(bytes: Uint8Array): void;
    toBuffer(): Buffer;
}
