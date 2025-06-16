import jwt from 'jsonwebtoken';

declare global {
  var __JWT_VERSION__: number | undefined;
}

// Fallback to 0 if not set
globalThis.__JWT_VERSION__ = globalThis.__JWT_VERSION__ ?? 0;

export function getTokenVersion(): number {
  return globalThis.__JWT_VERSION__!;
}

export function bumpTokenVersion(): number {
  globalThis.__JWT_VERSION__! += 1;
  return globalThis.__JWT_VERSION__!;
}

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string; 

export function createConfigJWT(configData: Record<string, any>): string {
  const version = bumpTokenVersion();
  const token = jwt.sign({ ...configData, tokenVersion: version }, JWT_SECRET, { expiresIn: "1d" });
  return token;
}

export function verifyConfigJWT(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>;
  } catch (e) {
    console.error("Invalid or expired JWT", e);
    return null;
  }
}


