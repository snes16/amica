import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { EvaluationResult } from './diagnosisScript';

export async function vrmDiagnosis(url: string): Promise<EvaluationResult> {
const start = performance.now();
  try {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser)); // Important!

    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    const end = performance.now();
    const duration = end - start;
    const status = !!vrm ? "pass" : "fail"; // If vrm object exists, it's a valid VRM
    const score = calculateScore({ status, duration });

    return { status, score }; 
  } catch (e) {
    const end = performance.now();
    const duration = end - start;
    return { status: "fail", score: calculateScore({ status: "fail", duration }) };
  }
}

// Score calculation logic
function calculateScore({
  status,
  duration,
}: {
  status: "pass" | "fail";
  duration: number;
}): number {
  let score = 0;
  if (status === "pass") score += 50;
  if (duration < 4000) score += 50 * ((4000 - duration) / 4000); 
  return Math.round(score);
}
