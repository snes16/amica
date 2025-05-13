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
