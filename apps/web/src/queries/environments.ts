import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const environmentQueries = {
  all: (projectId: string) => ["projects", projectId, "environments"] as const,

  list: (projectId: string) =>
    queryOptions({
      queryKey: [...environmentQueries.all(projectId), "list"],
      queryFn: async () => {
        const { data, error } = await api.internal.projects({ projectId }).environments.get();
        if (error) throw new Error(error.value.message);
        return data;
      },
      enabled: !!projectId,
    }),

  detail: (projectId: string, envId: string) =>
    queryOptions({
      queryKey: [...environmentQueries.all(projectId), envId],
      queryFn: async () => {
        const { data, error } = await api.internal.projects({ projectId }).environments({ envId }).get();
        if (error) throw new Error(error.value.message);
        return data;
      },
      enabled: !!projectId && !!envId,
    }),
};
