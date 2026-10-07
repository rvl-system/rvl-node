export function checkRange(value, min, max) {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`Expected an integer from ${min} to ${max}, got ${value}`);
    }
}
// Big-endian, like the firmware's read16() and read32()
export class AppendBuffer {
    bytes = [];
    append8(value) {
        checkRange(value, 0, 0xff);
        this.bytes.push(value);
    }
    appendInt8(value) {
        checkRange(value, -0x80, 0x7f);
        this.bytes.push(value & 0xff);
    }
    append16(value) {
        checkRange(value, 0, 0xffff);
        this.bytes.push((value >>> 8) & 0xff, value & 0xff);
    }
    append32(value) {
        checkRange(value, 0, 0xffffffff);
        this.bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    }
    appendString(value) {
        for (let i = 0; i < value.length; i++) {
            this.bytes.push(value.charCodeAt(i));
        }
    }
    appendBytes(bytes) {
        this.bytes.push(...bytes);
    }
    toBuffer() {
        return Buffer.from(this.bytes);
    }
}
//# sourceMappingURL=buffer.js.map