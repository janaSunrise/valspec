"use client";

import { createContext, useContext } from "react";
import type { Tables } from "@/types/database.types";

type Environment = Tables<"environments">;

interface EnvironmentContextValue {
  environment: Environment;
  projectId: string;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({
  environment,
  projectId,
  children,
}: EnvironmentContextValue & { children: React.ReactNode }) {
  return (
    <EnvironmentContext.Provider value={{ environment, projectId }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironmentContext() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("useEnvironmentContext must be used within EnvironmentProvider");
  }
  return context;
}
