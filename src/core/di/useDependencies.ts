import { useContext } from "react";

import { DependencyContext } from "./DependencyContext";

export function useDependencies() {
  const dependencies = useContext(DependencyContext);

  if (!dependencies) {
    throw new Error("useDependencies must be used inside AppProviders.");
  }

  return dependencies;
}
