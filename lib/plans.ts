import { PLAN_TYPE_HINTS, PLAN_TYPE_LABELS, PLAN_TYPE_OPTIONS } from "@/lib/constants";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ProjectPlan, ProjectPlanType, ProjectPlanVersion } from "@/lib/types";
import { getProjectBySlug } from "./documents";

type ProjectPlanRow = {
  id: string;
  project_id: string;
  plan_type: ProjectPlanType;
  title: string;
  description: string | null;
  current_version_number: number;
  current_file_path: string | null;
  current_mime_type: string | null;
  current_file_name: string | null;
  created_by_user_id: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectPlanVersionRow = {
  id: string;
  plan_id: string;
  uploaded_by_user_id: string | null;
  uploaded_by_email: string | null;
  version_number: number;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  notes: string | null;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
};

export async function getPlansByProjectSlug(projectSlug: string): Promise<ProjectPlan[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return [];
  }

  const { data, error } = await supabase
    .from("project_plans")
    .select(
      "id, project_id, plan_type, title, description, current_version_number, current_file_path, current_mime_type, current_file_name, created_by_user_id, created_by_email, created_at, updated_at"
    )
    .eq("project_id", project.id)
    .order("plan_type", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ProjectPlan[];
}

export async function getPlanById(planId: string): Promise<ProjectPlan | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_plans")
    .select(
      "id, project_id, plan_type, title, description, current_version_number, current_file_path, current_mime_type, current_file_name, created_by_user_id, created_by_email, created_at, updated_at"
    )
    .eq("id", planId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProjectPlan;
}

export async function getPlanByProjectSlugAndType(projectSlug: string, planType: ProjectPlanType): Promise<ProjectPlan | null> {
  const plans = await getPlansByProjectSlug(projectSlug);
  return plans.find((plan) => plan.plan_type === planType) ?? null;
}

export async function getPlanVersions(planId: string): Promise<ProjectPlanVersion[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("project_plan_versions")
    .select(
      "id, plan_id, uploaded_by_user_id, uploaded_by_email, version_number, file_path, file_name, mime_type, notes, is_current, superseded_at, created_at"
    )
    .eq("plan_id", planId)
    .order("version_number", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ProjectPlanVersion[];
}

export async function getPlanVersionById(versionId: string): Promise<ProjectPlanVersion | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("project_plan_versions")
    .select(
      "id, plan_id, uploaded_by_user_id, uploaded_by_email, version_number, file_path, file_name, mime_type, notes, is_current, superseded_at, created_at"
    )
    .eq("id", versionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProjectPlanVersion;
}

export type PlanSection = {
  planType: ProjectPlanType;
  label: string;
  hint: string;
  plan: ProjectPlan | null;
  versions: ProjectPlanVersion[];
};

export async function getPlanSections(projectSlug: string): Promise<PlanSection[]> {
  const plans = await getPlansByProjectSlug(projectSlug);
  const versionsByPlanId = new Map<string, ProjectPlanVersion[]>();

  await Promise.all(
    plans.map(async (plan) => {
      versionsByPlanId.set(plan.id, await getPlanVersions(plan.id));
    })
  );

  return PLAN_TYPE_OPTIONS.map((planType) => {
    const plan = plans.find((item) => item.plan_type === planType) ?? null;

    return {
      planType,
      label: PLAN_TYPE_LABELS[planType],
      hint: PLAN_TYPE_HINTS[planType],
      plan,
      versions: plan ? versionsByPlanId.get(plan.id) ?? [] : []
    };
  });
}
