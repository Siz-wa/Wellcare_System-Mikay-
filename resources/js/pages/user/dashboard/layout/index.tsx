// resources/js/layouts/app/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel export for the shared app layout.
// Import the layout shell from ONE canonical path across the entire app:
//
//   import { DashboardLayout } from "@/layouts/app";

export { DashboardLayout } from "./dashboard-layout";
export { AppSidebar }      from "./AppSidebar";
export { AppTopbar }       from "./AppTopbar";