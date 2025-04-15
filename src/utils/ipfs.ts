import { Readable } from 'stream';
import FormData from 'form-data';
import { ethers } from 'ethers';
import { base58 } from '@scure/base';

export function cidify(cid: string): string {
    if (! cid) {
      return '';
    }
    return base58.encode(ethers.getBytes(cid));
}

export async function pinFileToIPFS(content: Buffer, filename: string) {
  const formData = new FormData();
  const blob = new Blob([content], { type: "application/json" });

  formData.append("file", blob, { filename });

  formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));


  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      body: formData as any,
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
    });
    if (! res.ok) {
      throw new Error(`Pinata API Error (${res.status})`);
    }

    const data = await res.json();
    console.log('pinning res', data);

  return data.IpfsHash;
}
