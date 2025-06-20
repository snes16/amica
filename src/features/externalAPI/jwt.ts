import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string; 

export function createConfigJWT(sessionId: string,configData: Record<string, any>): string {
  const token = jwt.sign({ ...configData }, JWT_SECRET, { expiresIn: "1d" });
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


