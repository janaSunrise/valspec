import { queryOptions } from "@tanstack/react-query";

import { api, getErrorMessage } from "@/lib/api";

type AuditFilters = {
  environmentId?: string;
  action?: string;
};

export const auditQueries = {
  all: (projectId: string) => ["projects", projectId, "audit"] as const,

  list: (projectId: string, filters?: AuditFilters) =>
    queryOptions({
      queryKey: [...auditQueries.all(projectId), "list", filters],
      queryFn: async () => {
        const { data, error } = await api.internal.projects({ projectId }).audit.get({
          query: { ...filters, limit: 100 },
        });
        if (error) throw new Error(getErrorMessage(error));
        return data;
      },
      enabled: !!projectId,
    }),
};
