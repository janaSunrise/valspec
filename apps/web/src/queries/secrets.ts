import { queryOptions } from "@tanstack/react-query";

import { api, getErrorMessage } from "@/lib/api";

export const secretQueries = {
  all: (projectId: string, envId: string) =>
    ["projects", projectId, "environments", envId, "secrets"] as const,

  list: (projectId: string, envId: string) =>
    queryOptions({
      queryKey: [...secretQueries.all(projectId, envId), "list"],
      queryFn: async () => {
        const { data, error } = await api.internal
          .projects({ projectId })
          .environments({ envId })
          .secrets.get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId && !!envId,
    }),

  detail: (projectId: string, envId: string, secretId: string) =>
    queryOptions({
      queryKey: [...secretQueries.all(projectId, envId), secretId],
      queryFn: async () => {
        const { data, error } = await api.internal
          .projects({ projectId })
          .environments({ envId })
          .secrets({ secretId })
          .get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId && !!envId && !!secretId,
    }),

  export: (projectId: string, envId: string) =>
    queryOptions({
      queryKey: [...secretQueries.all(projectId, envId), "export"],
      queryFn: async () => {
        const { data, error } = await api.internal
          .projects({ projectId })
          .environments({ envId })
          .secrets.export.get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId && !!envId,
    }),
};
