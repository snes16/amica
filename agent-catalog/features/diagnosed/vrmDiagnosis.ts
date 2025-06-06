import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { EvaluationResult } from './diagnosisScript';

const TIME_OUT = 16000;
const MIN_DURATION = 4000;

// Timeout wrapper function
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("TimeoutError")), ms);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

export async function vrmDiagnosis(url: string, timeoutMs = TIME_OUT): Promise<EvaluationResult> {
  const start = performance.now();
  try {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser)); // Important!

    const gltf = await timeoutPromise(loader.loadAsync(url), timeoutMs);
    const vrm = gltf.userData.vrm;
    const end = performance.now();
    const duration = end - start;
    const status = !!vrm ? "pass" : "fail"; // If vrm object exists, it's a valid VRM
    const score = calculateScore({ status, duration });

    return { status, score };
  } catch (e: any) {
    const end = performance.now();
    const duration = end - start;
    const isTimeout = e.message === "TimeoutError";
    return {
      status: "fail",
      score: calculateScore({ status: "fail", duration, timeout: isTimeout }),
    };
  }
}

// Score calculation logic
function calculateScore({
  status,
  duration,
  timeout = false,
}: {
  status: "pass" | "fail";
  duration: number;
  timeout?: boolean;
}): number {
  if (timeout) return 0;
  let score = 0;
  if (status === "pass") score += 50;
  if (duration < MIN_DURATION) score += 50 * ((MIN_DURATION - duration) / MIN_DURATION);
  return Math.round(score);
}
