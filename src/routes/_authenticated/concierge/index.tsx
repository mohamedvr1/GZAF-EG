import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { createThread, listThreads } from "@/lib/concierge.functions";

export const Route = createFileRoute("/_authenticated/concierge/")({
  component: ConciergeIndex,
});

function ConciergeIndex() {
  const createFn = useServerFn(createThread);
  const listFn = useServerFn(listThreads);
  const navigate = useNavigate();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const threads = await listFn();
      const first = threads[0];
      if (first) {
        navigate({ to: "/concierge/$threadId", params: { threadId: first.id }, replace: true });
        return;
      }
      const { id } = await createFn();
      navigate({ to: "/concierge/$threadId", params: { threadId: id }, replace: true });
    })();
  }, [createFn, listFn, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="micro-label text-paper/40">Opening your atelier…</p>
    </div>
  );
}
