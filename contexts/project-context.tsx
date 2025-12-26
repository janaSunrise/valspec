'use client';

import { createContext, useContext } from 'react';
import type { Tables } from '@/types/database.types';

type Project = Tables<'projects'>;
type Environment = Tables<'environments'>;

interface ProjectContextValue {
  project: Project;
  environments: Environment[];
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  project,
  environments,
  children,
}: ProjectContextValue & { children: React.ReactNode }) {
  return (
    <ProjectContext.Provider value={{ project, environments }}>{children}</ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
}
