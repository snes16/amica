import { useContext, useCallback, useEffect, useState } from "react";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";

export default function VRMDemo({
  vrmUrl,
  onLoaded,
  onError,
}: {
  vrmUrl: string,
  onLoaded?: () => void,
  onError?: () => void,
}) {

  const { viewer } = useContext(ViewerContext);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setLoadingError(false);
  }, [vrmUrl]);


  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (canvas) {
        viewer.setup(canvas);
        (new Promise(async (resolve, reject) => {
          try {
            const loaded = await viewer.loadVrm(vrmUrl);
            resolve(true);
          } catch (e) {
            reject();
          }
        }))
          .then(() => {
            console.log("vrm loaded");
            setIsLoading(false);
            setLoadingError(false);
            onLoaded && onLoaded();
          })
          .catch((e) => {
            console.error("vrm loading error", e);
            setLoadingError(true);
            setIsLoading(false);
            onError && onError();
          });
      }
    },
    [viewer, vrmUrl]
  );


  return (
    <>
      <canvas ref={canvasRef} className={"h-full w-full"} />
      {isLoading && (
        <p className="absolute text-gray-800 font-orbitron text-2xl">Loading...</p>
      )}
      {loadingError && (
        <p className="absolute text-gray-800 font-orbitron text-2xl">Error loading VRM model</p>
      )}
    </>
  );
}



