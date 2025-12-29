import { queryOptions } from "@tanstack/react-query";

import { api, getErrorMessage } from "@/lib/api";

export const projectQueries = {
  all: () => ["projects"] as const,

  list: () =>
    queryOptions({
      queryKey: [...projectQueries.all(), "list"],
      queryFn: async () => {
        const { data, error } = await api.internal.projects.get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
    }),

  detail: (projectId: string) =>
    queryOptions({
      queryKey: [...projectQueries.all(), projectId],
      queryFn: async () => {
        const { data, error } = await api.internal.projects({ projectId }).get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId,
    }),
};
