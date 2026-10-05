export function checkRange(value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Expected an integer from ${min} to ${max}, got ${value}`);
  }
}

// Big-endian, like the firmware's read16() and read32()
export class AppendBuffer {
  protected bytes: number[] = [];

  append8(value: number) {
    checkRange(value, 0, 0xff);
    this.bytes.push(value);
  }

  appendInt8(value: number) {
    checkRange(value, -0x80, 0x7f);
    this.bytes.push(value & 0xff);
  }

  append16(value: number) {
    checkRange(value, 0, 0xffff);
    this.bytes.push((value >>> 8) & 0xff, value & 0xff);
  }

  append32(value: number) {
    checkRange(value, 0, 0xffffffff);
    this.bytes.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff
    );
  }

  appendString(value: string) {
    for (let i = 0; i < value.length; i++) {
      this.bytes.push(value.charCodeAt(i));
    }
  }

  appendBuffer(other: AppendBuffer): void {
    this.bytes.push(...other.bytes);
  }

  toBuffer(): Buffer {
    return Buffer.from(this.bytes);
  }
}
