export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parcel_number: string;
  address: string;
  county: string;
  state: string;
};

export type ReviewerComment = {
  id: string;
  project_id?: string;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  application_number: string;
  comment_id: string;
  page_reference?: string | null;
  annotation_type?: string | null;
  reviewer_name: string;
  department: string;
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "open"
    | "in_progress"
    | "waiting_on_city"
    | "waiting_on_owner"
    | "waiting_on_engineer"
    | "resolved"
    | "deferred";
  responsible_party: string;
  comment_text: string;
  response_text?: string;
  linked_document_id?: string | null;
  linked_document_title?: string;
  imported_from_document_id?: string | null;
  due_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AccessLogEntry = {
  id: string;
  project_id?: string;
  log_date: string | null;
  access_feature: string;
  status: string | null;
  description: string | null;
  road_condition: string | null;
  gate_condition: string | null;
  weather: string | null;
  linked_document_id?: string | null;
  linked_document_title?: string | null;
  created_at?: string;
};

export type ProjectTask = {
  id: string;
  project_id?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  responsible_party?: string | null;
  waiting_on?: string | null;
  due_date?: string | null;
  linked_comment_id?: string | null;
  linked_document_id?: string | null;
  linked_document_title?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DocumentChunk = {
  id: string;
  project_id: string;
  document_id?: string | null;
  transcript_id?: string | null;
  source_type: "document" | "transcript";
  chunk_index?: number | null;
  chunk_text: string;
  page_number?: number | null;
  section_label?: string | null;
  created_at?: string;
};

export type MeetingTranscript = {
  id: string;
  project_id: string;
  title: string;
  meeting_date?: string | null;
  participants?: string | null;
  source?: string | null;
  audio_file_path?: string | null;
  transcript_file_path?: string | null;
  transcript_text?: string | null;
  transcription_status?: string | null;
  transcription_model?: string | null;
  transcription_error?: string | null;
  notes?: string | null;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EvidencePhoto = {
  id: string;
  project_id: string;
  title: string;
  media_kind?: "photo" | "video" | null;
  mime_type?: string | null;
  photo_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  easting?: number | null;
  northing?: number | null;
  direction_facing?: string | null;
  category?: string | null;
  file_path?: string | null;
  notes?: string | null;
  linked_point_id?: string | null;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  created_at?: string;
};

export type FieldPoint = {
  id: string;
  project_id?: string;
  uploaded_by_user_id?: string | null;
  uploaded_by_email?: string | null;
  import_source_file?: string | null;
  import_batch_name?: string | null;
  point_name: string;
  point_type: string;
  easting?: number;
  northing?: number;
  elevation?: number;
  coordinate_system?: string;
  latitude?: number;
  longitude?: number;
  collection_method?: string;
  source_equipment?: string;
  confidence: string;
  description?: string;
  photo_document_id?: string | null;
  collected_at?: string | null;
  created_at?: string;
};

export type FieldPointImportRow = {
  point_name: string;
  point_type: string;
  easting?: number;
  northing?: number;
  elevation?: number;
  coordinate_system?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  source_equipment?: string;
  collection_method?: string;
  confidence: string;
  collected_at?: string;
  validationIssues: string[];
};

export type Culvert = {
  id: string;
  project_id: string;
  culvert_id: string;
  inlet_point_id: string | null;
  outlet_point_id: string | null;
  diameter_inches: number | null;
  material: string | null;
  length_feet: number | null;
  slope_percent: number | null;
  condition: string | null;
  ownership: string | null;
  flow_direction: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type DocumentType =
  | "deed"
  | "easement"
  | "annexation_agreement"
  | "title_commitment"
  | "survey"
  | "plat"
  | "drainage_report"
  | "geohazard_report"
  | "city_comment_letter"
  | "usfs_correspondence"
  | "fire_review"
  | "utility_correspondence"
  | "photo_log"
  | "lidar"
  | "other";

export type ProjectDocument = {
  id: string;
  project_id: string;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  title: string;
  document_type: DocumentType;
  record_date: string | null;
  reception_number: string | null;
  book: string | null;
  page: string | null;
  source_agency: string | null;
  file_path: string | null;
  external_url: string | null;
  notes: string | null;
  status: string;
  current_version_number: number;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  uploaded_by_user_id?: string | null;
  uploaded_by_email?: string | null;
  version_number: number;
  file_path: string;
  notes: string | null;
  is_current: boolean;
  superseded_at: string | null;
  created_at: string;
};

export type ProjectPlanType = "site_plan" | "land_usability" | "final_plat" | "building_plans";

export type ProjectPlan = {
  id: string;
  project_id: string;
  plan_type: ProjectPlanType;
  title: string;
  description?: string | null;
  current_version_number: number;
  current_file_path?: string | null;
  current_mime_type?: string | null;
  current_file_name?: string | null;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectPlanVersion = {
  id: string;
  plan_id: string;
  uploaded_by_user_id?: string | null;
  uploaded_by_email?: string | null;
  version_number: number;
  file_path: string;
  file_name?: string | null;
  mime_type?: string | null;
  notes?: string | null;
  is_current: boolean;
  superseded_at?: string | null;
  created_at: string;
};

export type LidarScan = {
  id: string;
  project_id: string;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  title: string;
  status?: string | null;
  processing_stage?: string | null;
  tile_format?: string | null;
  scan_date?: string | null;
  equipment?: string | null;
  coordinate_system?: string | null;
  center_easting?: number | null;
  center_northing?: number | null;
  center_elevation?: number | null;
  center_latitude?: number | null;
  center_longitude?: number | null;
  bbox_west?: number | null;
  bbox_south?: number | null;
  bbox_east?: number | null;
  bbox_north?: number | null;
  raw_file_path?: string | null;
  tile_path?: string | null;
  preview_image_path?: string | null;
  point_count?: number | null;
  area_acres?: number | null;
  min_elevation?: number | null;
  max_elevation?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type LprCamera = {
  id: string;
  project_id: string;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  elevation_ft?: number | null;
  install_location?: string | null;
  direction_facing?: string | null;
  connectivity?: string | null;
  power_source?: string | null;
  solar_panel_watts?: number | null;
  battery_wh?: number | null;
  camera_ip?: string | null;
  integration_type?: string | null;
  active?: boolean | null;
  last_seen_at?: string | null;
  created_at?: string | null;
};

export type LprEvent = {
  id: string;
  camera_id: string;
  observed_at: string;
  plate_text?: string | null;
  plate_confidence?: number | null;
  plate_state?: string | null;
  vehicle_type?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  direction?: string | null;
  image_path?: string | null;
  plate_crop_path?: string | null;
  event_latitude?: number | null;
  event_longitude?: number | null;
  raw_payload?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type LprDailyStat = {
  id: string;
  camera_id: string;
  stat_date: string;
  total_vehicles?: number | null;
  unique_plates?: number | null;
  inbound_count?: number | null;
  outbound_count?: number | null;
  first_vehicle_at?: string | null;
  last_vehicle_at?: string | null;
};

export type RoadAuthorityLevel =
  | "authoritative"
  | "authoritative_weather"
  | "partner_observation"
  | "state_community"
  | "manual_external";

export type RoadStatus =
  | "open"
  | "closed"
  | "partially_closed"
  | "restricted"
  | "seasonal_closure"
  | "unknown"
  | "not_reported";

export type GateStatus =
  | "open"
  | "closed"
  | "locked"
  | "seasonal"
  | "unknown"
  | "not_applicable";

export type OverallAccessRisk = "low" | "moderate" | "high" | "severe" | "unknown";

export type RoadCorridor = {
  id: string;
  project_id: string;
  name: string;
  road_number?: string | null;
  alternate_names?: string[] | null;
  managing_agency?: string | null;
  description?: string | null;
  start_lat?: number | null;
  start_lon?: number | null;
  end_lat?: number | null;
  end_lon?: number | null;
  min_elevation_ft?: number | null;
  max_elevation_ft?: number | null;
  length_miles?: number | null;
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoadSegment = {
  id: string;
  corridor_id: string;
  segment_name: string;
  sequence_no?: number | null;
  start_mile?: number | null;
  end_mile?: number | null;
  start_elevation_ft?: number | null;
  end_elevation_ft?: number | null;
  avg_grade_percent?: number | null;
  max_grade_percent?: number | null;
  avg_width_ft?: number | null;
  min_width_ft?: number | null;
  surface_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type RoadDataSource = {
  id: string;
  provider_key: string;
  provider_name: string;
  source_type: string;
  authority_level: RoadAuthorityLevel;
  base_url?: string | null;
  enabled?: boolean | null;
  ingestion_method?: string | null;
  default_refresh_minutes?: number | null;
  parser_version?: string | null;
  terms_notes?: string | null;
  last_success_at?: string | null;
  last_attempt_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoadStatusObservation = {
  id: string;
  corridor_id: string;
  segment_id?: string | null;
  source_id?: string | null;
  observed_at: string;
  fetched_at?: string | null;
  status: RoadStatus;
  gate_status?: GateStatus | null;
  restriction_type?: string | null;
  summary?: string | null;
  raw_status_text?: string | null;
  source_url?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  confidence?: number | null;
  official?: boolean | null;
  raw_payload?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type RoadClosureAlert = {
  id: string;
  corridor_id?: string | null;
  segment_id?: string | null;
  source_id?: string | null;
  alert_type?: string | null;
  severity?: string | null;
  title: string;
  description?: string | null;
  effective_at?: string | null;
  expires_at?: string | null;
  active?: boolean | null;
  forest_order_number?: string | null;
  source_url?: string | null;
  source_document_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoadWeatherLocation = {
  id: string;
  corridor_id?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  elevation_ft?: number | null;
  station_identifier?: string | null;
  source?: string | null;
  active?: boolean | null;
  created_at?: string | null;
};

export type WeatherObservation = {
  id: string;
  location_id: string;
  source_id?: string | null;
  observed_at: string;
  temperature_f?: number | null;
  dewpoint_f?: number | null;
  relative_humidity_percent?: number | null;
  wind_speed_mph?: number | null;
  wind_gust_mph?: number | null;
  wind_direction_deg?: number | null;
  precipitation_1h_in?: number | null;
  precipitation_24h_in?: number | null;
  snow_depth_in?: number | null;
  visibility_miles?: number | null;
  pressure_mb?: number | null;
  weather_description?: string | null;
  raw_payload?: Record<string, unknown> | null;
  fetched_at?: string | null;
};

export type WeatherForecast = {
  id: string;
  location_id: string;
  source_id?: string | null;
  forecast_generated_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  temperature_f?: number | null;
  precipitation_probability?: number | null;
  snowfall_inches?: number | null;
  wind_speed_mph?: number | null;
  wind_gust_mph?: number | null;
  short_forecast?: string | null;
  detailed_forecast?: string | null;
  raw_payload?: Record<string, unknown> | null;
  fetched_at?: string | null;
};

export type RoadConditionReport = {
  id: string;
  corridor_id?: string | null;
  segment_id?: string | null;
  report_source?: string | null;
  reported_by?: string | null;
  observed_at: string;
  condition?: string | null;
  surface_condition?: string | null;
  mud_severity?: string | null;
  snow_severity?: string | null;
  rut_severity?: string | null;
  washout?: boolean | null;
  fallen_tree?: boolean | null;
  standing_water?: boolean | null;
  erosion?: boolean | null;
  passability?: string | null;
  recommended_vehicle?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_id?: string | null;
  source_url?: string | null;
  verified?: boolean | null;
  created_at?: string | null;
};

export type RoadFieldMeasurement = {
  id: string;
  corridor_id?: string | null;
  segment_id?: string | null;
  measurement_type: string;
  measured_at?: string | null;
  value?: number | null;
  units?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  elevation_ft?: number | null;
  source_equipment?: string | null;
  source_point_id?: string | null;
  lidar_scan_id?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type RoadDailySnapshot = {
  id: string;
  corridor_id: string;
  snapshot_date: string;
  consolidated_status?: RoadStatus | null;
  gate_status?: GateStatus | null;
  status_confidence?: number | null;
  status_source?: string | null;
  min_temperature_f?: number | null;
  max_temperature_f?: number | null;
  precipitation_24h_in?: number | null;
  snowfall_24h_in?: number | null;
  max_wind_gust_mph?: number | null;
  active_weather_alerts?: number | null;
  active_usfs_alerts?: number | null;
  road_condition_score?: number | null;
  weather_risk_score?: number | null;
  overall_access_risk?: OverallAccessRisk | null;
  summary?: string | null;
  generated_at?: string | null;
  source_snapshot?: Record<string, unknown> | null;
};

export type RoadCurrentStatus = {
  corridor_id: string;
  road_name: string;
  consolidated_status?: RoadStatus | null;
  consolidated_status_reason?: string | null;
  consolidated_status_source?: string | null;
  consolidated_status_time?: string | null;
  official_status?: RoadStatus | null;
  official_status_time?: string | null;
  official_status_source?: string | null;
  partner_status?: RoadStatus | null;
  partner_status_time?: string | null;
  gate_status?: GateStatus | null;
  active_usfs_alert_count?: number | null;
  active_weather_alert_count?: number | null;
  temperature_f?: number | null;
  weather_description?: string | null;
  wind_mph?: number | null;
  wind_gust_mph?: number | null;
  forecast_snow_inches?: number | null;
  forecast_precip_probability?: number | null;
  latest_condition_report?: string | null;
  latest_verified_condition_report?: string | null;
  condition_report_count_7d?: number | null;
  overall_access_risk?: OverallAccessRisk | null;
  last_updated?: string | null;
};

export type RoadWeatherLocationSnapshot = {
  location: RoadWeatherLocation;
  latestObservation: WeatherObservation | null;
  nextForecast: WeatherForecast | null;
};

export type RoadStatusEvent = {
  id: string;
  corridor_id: string;
  event_type: string;
  old_value?: string | null;
  new_value?: string | null;
  detected_at?: string | null;
  source_id?: string | null;
  supporting_observation_id?: string | null;
  description?: string | null;
};

export type RoadIngestionRun = {
  id: string;
  source_id?: string | null;
  job_name?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
  records_received?: number | null;
  records_inserted?: number | null;
  records_updated?: number | null;
  http_status?: number | null;
  error_message?: string | null;
  parser_version?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RoadSourceHealth = {
  source: RoadDataSource;
  latestRun: RoadIngestionRun | null;
  freshness: "current" | "aging" | "stale" | "failed" | "never";
  failureCount7d: number;
};
