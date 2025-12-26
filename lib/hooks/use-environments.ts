import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectKeys } from './use-projects';

export const environmentKeys = {
  all: (projectId: string) => ['environments', projectId] as const,
  detail: (projectId: string, envId: string) => ['environments', projectId, envId] as const,
};

export function useCreateEnvironment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; color?: string; inherits_from_id?: string | null }) => {
      const res = await fetch(`/api/projects/${projectId}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create environment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useUpdateEnvironment(projectId: string, envId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; color?: string; inherits_from_id?: string | null }) => {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update environment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useDeleteEnvironment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (envId: string) => {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete environment');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
