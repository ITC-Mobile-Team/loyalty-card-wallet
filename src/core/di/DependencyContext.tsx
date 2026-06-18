import { createContext } from "react";

import type { AppDependencies } from "./dependencies";

export const DependencyContext = createContext<AppDependencies | null>(null);
