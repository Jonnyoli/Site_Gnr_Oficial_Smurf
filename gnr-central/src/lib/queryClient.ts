import {
  QueryClient,
} from "@tanstack/react-query";

export const queryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:
          60_000,
        gcTime:
          15 * 60_000,
        retry: 1,
        retryDelay:
          (attempt) =>
            Math.min(
              750 *
                2 ** attempt,
              4_000,
            ),
        refetchOnWindowFocus:
          false,
        refetchOnReconnect:
          true,
        refetchOnMount:
          false,
        networkMode:
          "online",
        structuralSharing:
          true,
      },
      mutations: {
        retry: 0,
        networkMode:
          "online",
      },
    },
  });

export default queryClient;
