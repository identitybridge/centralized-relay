export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function hashToBuffer(hash: string): Buffer {
  const hexString = hash.startsWith('0x') ? hash.slice(2) : hash;
  
  if (hexString.length !== 64) {
    throw new Error(`Invalid hash length: expected 64 hex chars, got ${hexString.length}`);
  }
  
  return Buffer.from(hexString, 'hex');
}

export function bufferToHash(buffer: Buffer): `0x${string}` {
  if (buffer.length !== 32) {
    throw new Error(`Invalid buffer length: expected 32 bytes, got ${buffer.length}`);
  }
  
  return `0x${buffer.toString('hex')}`;
}

export function hashToArray(hash: string): number[] {
  const buffer = hashToBuffer(hash);
  return Array.from(buffer);
}

export function arrayToHash(array: number[]): `0x${string}` {
  if (array.length !== 32) {
    throw new Error(`Invalid array length: expected 32 elements, got ${array.length}`);
  }
  
  return `0x${Buffer.from(array).toString('hex')}`;
}

