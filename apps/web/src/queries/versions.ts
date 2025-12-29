import { queryOptions } from "@tanstack/react-query";

import { api, getErrorMessage } from "@/lib/api";

export const versionQueries = {
  all: (projectId: string, envId: string, secretId: string) =>
    ["projects", projectId, "environments", envId, "secrets", secretId, "versions"] as const,

  list: (projectId: string, envId: string, secretId: string) =>
    queryOptions({
      queryKey: [...versionQueries.all(projectId, envId, secretId), "list"],
      queryFn: async () => {
        const { data, error } = await api.internal
          .projects({ projectId })
          .environments({ envId })
          .secrets({ secretId })
          .versions.get();
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId && !!envId && !!secretId,
    }),
};
