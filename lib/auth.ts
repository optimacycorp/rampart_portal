export const APP_ROLE_OPTIONS = ["owner", "audit", "engineer", "surveyor", "collaborator", "viewer"] as const;

export type AppRole = (typeof APP_ROLE_OPTIONS)[number];

export function normalizeAppRole(value: string | null | undefined): AppRole {
  return APP_ROLE_OPTIONS.includes((value ?? "") as AppRole) ? ((value ?? "") as AppRole) : "viewer";
}
