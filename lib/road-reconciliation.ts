import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { RoadCurrentStatus, RoadStatusEvent } from "@/lib/types";

export async function getRoadCurrentStatusByCorridorId(corridorId: string): Promise<RoadCurrentStatus | null> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("road_current_status").select("*").eq("corridor_id", corridorId).maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as RoadCurrentStatus;
}

export async function getRecentRoadStatusEvents(corridorId: string, limit = 8): Promise<RoadStatusEvent[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("road_status_events")
    .select("id, corridor_id, event_type, old_value, new_value, detected_at, source_id, supporting_observation_id, description")
    .eq("corridor_id", corridorId)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as RoadStatusEvent[];
}
