export const DEMO_AUTH_STORAGE_KEY = "rampart-demo-auth";
export const DEMO_ROLE_STORAGE_KEY = "rampart-demo-role";
export const DEMO_AUTH_COOKIE = "rampart_demo_auth";
export const DEMO_ROLE_COOKIE = "rampart_demo_role";

export const DEMO_ROLE_OPTIONS = ["owner", "audit", "engineer", "surveyor", "collaborator", "viewer"] as const;

export type DemoRole = (typeof DEMO_ROLE_OPTIONS)[number];

export function normalizeDemoRole(value: string | null | undefined): DemoRole {
  return DEMO_ROLE_OPTIONS.includes((value ?? "") as DemoRole) ? ((value ?? "") as DemoRole) : "viewer";
}
