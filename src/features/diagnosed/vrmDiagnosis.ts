import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

export async function vrmDiagnosis(url: string): Promise<string> {
  try {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser)); // Important!

    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    const status = !!vrm ? "pass" : "fail"; // If vrm object exists, it's a valid VRM
    return status;
  } catch (e) {
    return "fail";
  }
}
