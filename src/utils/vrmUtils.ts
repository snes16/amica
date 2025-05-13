export async function updateVrmAvatar(viewer: any, url: string) {
  try {
    await viewer.loadVrm(url);
  } catch (e) {
    console.error(e);
  }
}

export function vrmDetector(source: File, type: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(source);
    (async () => {
      const ab = await source.arrayBuffer();
      const buf = Buffer.from(ab);
      if (buf.slice(0, 4).toString() === "glTF") {
        resolve("model/gltf-binary");
      } else {
        resolve("unknown");
      }
    })();
  });
}
