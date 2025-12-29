import { queryOptions } from "@tanstack/react-query";

import { api, getErrorMessage } from "@/lib/api";

export const apiKeyQueries = {
  all: () => ["api-keys"] as const,

  list: (projectId?: string) =>
    queryOptions({
      queryKey: [...apiKeyQueries.all(), "list", { projectId }],
      queryFn: async () => {
        const { data, error } = await api.internal["api-keys"].get({ query: { projectId } });
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
    }),

  detail: (keyId: string) =>
    queryOptions({
      queryKey: [...apiKeyQueries.all(), keyId],
      queryFn: async () => {
        const { data, error } = await api.internal["api-keys"]({ keyId }).get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!keyId,
    }),
};
