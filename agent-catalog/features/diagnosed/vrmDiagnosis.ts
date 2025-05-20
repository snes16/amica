import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

export async function vrmDiagnosis(url: string): Promise<boolean> {
  try {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser)); // Important!

    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;

    return !!vrm; // If vrm object exists, it's a valid VRM
  } catch (e) {
    // Parsing failed, not a valid VRM
    return false;
  }
}
