import { beginPerformanceNavigation } from "./lib/performance-navigation";
export function onRouterTransitionStart(url: string) { beginPerformanceNavigation(url); }
