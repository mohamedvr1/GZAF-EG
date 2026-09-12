import { createFileRoute, Link, Outlet, useParams, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listThreads, createThread, deleteThread } from "@/lib/concierge.functions";
import { SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/_authenticated/concierge")({
  component: ConciergeLayout,
});

function ConciergeLayout() {
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: threads = [] } = useQuery({
    queryKey: ["concierge-threads"],
    queryFn: () => listFn(),
  });

  const activeParams = useParams({ strict: false }) as { threadId?: string };
  const activeId = activeParams.threadId;

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: async ({ id }) => {
      await qc.invalidateQueries({ queryKey: ["concierge-threads"] });
      navigate({ to: "/concierge/$threadId", params: { threadId: id } });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concierge-threads"] }),
  });

  return (
    <div className="min-h-screen bg-noir text-paper">
      <SiteHeader />
      <div className="grid grid-cols-12 min-h-[calc(100vh-120px)]">
        <aside className="col-span-3 border-r border-white/10 p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-couture-red">07 · Concierge</p>
          </div>
          <h2 className="font-display italic text-3xl leading-none">Style<br />Concierge</h2>
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="w-full bg-couture-red text-paper eyebrow py-3 hover:bg-couture-red-deep transition-colors"
          >
            + New Conversation
          </button>
          <div className="pt-4 border-t border-white/10 space-y-1 max-h-[65vh] overflow-y-auto">
            {threads.length === 0 && (
              <p className="text-xs text-paper/40 italic">No conversations yet.</p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center gap-2 px-3 py-2.5 border-l-2 transition-colors ${
                  activeId === t.id
                    ? "border-couture-red bg-white/5"
                    : "border-transparent hover:bg-white/5"
                }`}
              >
                <Link
                  to="/concierge/$threadId"
                  params={{ threadId: t.id }}
                  className="flex-1 min-w-0 text-sm text-paper/85 truncate"
                >
                  {t.title}
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this conversation?")) delMut.mutate(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-xs text-paper/40 hover:text-couture-red"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </aside>
        <main className="col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
