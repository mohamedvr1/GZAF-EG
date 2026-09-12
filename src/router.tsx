import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Fresh per-request client (required for SSR). Sensible caching defaults so
  // route transitions and hover-prefetches hit the cache instead of refetching.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Let TanStack Query own freshness; router preload cache should not
    // shadow it.
    defaultPreloadStaleTime: 0,
    // Hover / focus prefetch on <Link> — snappier feels on nav.
    defaultPreload: "intent",
  });

  return router;
};

