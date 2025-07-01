import { useEffect } from "react";
import { useRouter } from "next/router";

export function useFullUnmountHandler(onFullUnmount: () => void) {
  const router = useRouter();

  // React component unmount (e.g. conditional unmount or route change)
  useEffect(() => {
    return () => {
      onFullUnmount();
    };
  }, []);

  // Browser page reload, tab close, or window close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      onFullUnmount();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Next.js SPA client-side navigation start
  useEffect(() => {
    router.events.on("routeChangeStart", onFullUnmount);

    return () => {
      router.events.off("routeChangeStart", onFullUnmount);
    };
  }, [router.events]);
}
