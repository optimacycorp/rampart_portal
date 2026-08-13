import "server-only";

import { seededRoadCorridor, seededRoadFieldMeasurements } from "@/lib/mock-data";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { RoadFieldMeasurement } from "@/lib/types";

type RoadMeasurementStats = {
  totalMeasurements: number;
  lidarLinkedMeasurements: number;
  linkedPointMeasurements: number;
  recentMeasurementAt: string | null;
};

export async function getRoadFieldMeasurementsByCorridorId(
  corridorId: string,
  limit = 20
): Promise<RoadFieldMeasurement[]> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return corridorId === seededRoadCorridor.id ? seededRoadFieldMeasurements.slice(0, limit) : [];
  }

  const { data, error } = await supabase
    .from("road_field_measurements")
    .select(
      "id, corridor_id, segment_id, measurement_type, measured_at, value, units, latitude, longitude, elevation_ft, source_equipment, source_point_id, lidar_scan_id, notes, created_at"
    )
    .eq("corridor_id", corridorId)
    .order("measured_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as RoadFieldMeasurement[];
}

export async function getRoadMeasurementStats(corridorId: string): Promise<RoadMeasurementStats> {
  const measurements = await getRoadFieldMeasurementsByCorridorId(corridorId, 250);

  return {
    totalMeasurements: measurements.length,
    lidarLinkedMeasurements: measurements.filter((measurement) => measurement.lidar_scan_id).length,
    linkedPointMeasurements: measurements.filter((measurement) => measurement.source_point_id).length,
    recentMeasurementAt: measurements[0]?.measured_at ?? measurements[0]?.created_at ?? null
  };
}
