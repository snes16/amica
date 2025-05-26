import { createHash } from "crypto";

export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashValue = createHash("sha256")
    .update(Buffer.from(buffer))
    .digest("hex");
  return hashValue;
}



// Compute multiplicative inverse (could use extended Euclidean algorithm)

const PRIME = 1000003; // a large prime > max agentId
const MULTIPLIER = 345679; // secret, coprime with PRIME

const modInverse = (a: number, m: number) => {
  let m0 = m, x0 = 0, x1 = 1;
  if (m === 1) return 0;

  while (a > 1) {
    const q = Math.floor(a / m);
    [a, m] = [m, a % m];
    [x0, x1] = [x1 - q * x0, x0];
  }
  return x1 < 0 ? x1 + m0 : x1;
};

const MULTIPLIER_INV = modInverse(MULTIPLIER, PRIME);

/**
 * Encode agentId to obfuscated base36 string
 */
export function encodeAgentId(agentId: number): string {
  const scrambled = (agentId * MULTIPLIER) % PRIME;
  return scrambled.toString(36).padStart(6, '0');
}

/**
 * Decode obfuscated base36 string back to agentId
 */
export function decodeAgentId(encoded: string): number {
  const scrambled = parseInt(encoded, 36);
  const original = (scrambled * MULTIPLIER_INV) % PRIME;
  return original;
}



