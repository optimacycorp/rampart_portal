import {
  AccessLogEntry,
  DocumentChunk,
  EvidencePhoto,
  FieldPoint,
  LprCamera,
  LprDailyStat,
  LprEvent,
  MeetingTranscript,
  RoadClosureAlert,
  RoadConditionReport,
  RoadCorridor,
  RoadCurrentStatus,
  RoadDataSource,
  RoadDailySnapshot,
  RoadFieldMeasurement,
  RoadWeatherLocationSnapshot,
  RoadWeatherLocation,
  WeatherForecast,
  WeatherObservation,
  Project,
  ProjectTask,
  ReviewerComment
} from "@/lib/types";

export const seededProject: Project = {
  id: "4d00e17d-0bcf-4840-83a7-9d24f8079f11",
  name: "3245 Rampart Range Road",
  slug: "3245-rampart-range-road",
  description:
    "Rampart Range development, access, drainage, easement, and planning evidence portal.",
  parcel_number: "7333200002",
  address: "3245 Rampart Range Road, Colorado Springs, CO",
  county: "El Paso County",
  state: "Colorado"
};

export const seededReviewerComments: ReviewerComment[] = [
  {
    id: "c1",
    project_id: seededProject.id,
    application_number: "SUBD-24-0106",
    comment_id: "PLN-01",
    reviewer_name: "Planning Staff",
    department: "Planning",
    priority: "high",
    status: "open",
    responsible_party: "Thomas",
    comment_text: "Clarify the document trail supporting private access assumptions.",
    response_text: "Collecting deed and easement support into the portal.",
    linked_document_id: "doc-fallback-1",
    linked_document_title: "Access Exhibit Index"
  },
  {
    id: "c2",
    project_id: seededProject.id,
    application_number: "DEPN-25-0102",
    comment_id: "SWENT-04",
    reviewer_name: "Stormwater Reviewer",
    department: "City Engineering - SWENT",
    priority: "critical",
    status: "waiting_on_engineer",
    responsible_party: "Dave Gorman / MVE",
    comment_text: "Identify culvert assumptions and supporting field evidence for drainage routing."
  },
  {
    id: "c3",
    project_id: seededProject.id,
    application_number: "STM-MP24-0278",
    comment_id: "FIRE-02",
    reviewer_name: "Fire Reviewer",
    department: "Fire",
    priority: "medium",
    status: "in_progress",
    responsible_party: "Fire",
    comment_text: "Provide access observations relevant to seasonal or gate-related constraints."
  }
];

export const seededApplicationNumbers = [
  "SUBD-24-0106",
  "DEPN-25-0102",
  "STM-MP24-0278",
  "STM-REV24-0768"
];

export const seededDepartments = [
  "Planning",
  "City Engineering - SWENT",
  "City Engineering Dev Review",
  "Colorado Springs Utilities",
  "Fire",
  "Real Estate Services",
  "Regional Building",
  "USFS"
];

export const seededResponsibleParties = [
  "Thomas",
  "Dave Gorman / MVE",
  "Surveyor",
  "City Planning",
  "CSU",
  "USFS",
  "Fire",
  "TBD"
];

export const seededFieldPoints: FieldPoint[] = [
  {
    id: "fp-1",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Initial Control Import",
    point_name: "CEN1",
    point_type: "monument",
    easting: 3171382.152,
    northing: 1381355.997,
    elevation: 6992.865,
    latitude: 38.92176425,
    longitude: -104.61773785,
    confidence: "rtk_observed",
    description: "POB/NW corner",
    collected_at: "2026-02-08T13:27:12-06:00"
  },
  {
    id: "fp-2",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Initial Control Import",
    point_name: "DW_FOUND_CAP",
    point_type: "monument",
    easting: 3171950.996,
    northing: 1381143.475,
    elevation: 6938.907,
    latitude: 38.92176425,
    longitude: -104.61773785,
    confidence: "rtk_observed",
    description: "Found cap likely property corner",
    collected_at: "2026-02-08T13:27:53-06:00"
  },
  {
    id: "fp-3",
    uploaded_by_user_id: "demo-owner",
    uploaded_by_email: "team@rampart-range.org",
    import_source_file: "emlid-field-points-template.csv",
    import_batch_name: "Drainage Recon Batch A",
    point_name: "CULV-IN-01",
    point_type: "culvert_inlet",
    elevation: 6942.1,
    latitude: 38.9221,
    longitude: -104.6184,
    confidence: "field_observed",
    description: "Observed inlet on uphill road edge",
    collected_at: "2026-02-08T13:29:00-06:00"
  }
];

export const seededAccessLogs: AccessLogEntry[] = [
  {
    id: "access-1",
    project_id: seededProject.id,
    log_date: "2026-05-10",
    access_feature: "FS 0300 road segment",
    status: "Road maintenance",
    description: "Observed rutting and drainage crossing near turnout.",
    road_condition: "Rutting near crossing",
    gate_condition: null,
    weather: "Dry",
    linked_document_id: "doc-fallback-2",
    linked_document_title: "Drainage Observation Log"
  },
  {
    id: "access-2",
    project_id: seededProject.id,
    log_date: "2026-05-06",
    access_feature: "Garden of the Gods gate",
    status: "Gate condition",
    description: "Gate condition documented with photo set and access notes.",
    road_condition: null,
    gate_condition: "Operational during visit",
    weather: "Clear",
    linked_document_id: "doc-fallback-1",
    linked_document_title: "Access Exhibit Index"
  }
];

export const seededProjectTasks: ProjectTask[] = [
  {
    id: "task-1",
    project_id: seededProject.id,
    title: "Compile USFS access coordination package",
    description: "Assemble recent correspondence, access observations, and gate status records for the next USFS follow-up.",
    status: "open",
    priority: "high",
    responsible_party: "Thomas",
    waiting_on: "USFS",
    linked_document_id: "doc-fallback-1",
    linked_document_title: "Access Exhibit Index"
  },
  {
    id: "task-2",
    project_id: seededProject.id,
    title: "Confirm drainage support for culvert assumptions",
    description: "Tie culvert field observations to open SWENT comments and supporting drainage notes.",
    status: "in_progress",
    priority: "critical",
    responsible_party: "Dave Gorman / MVE",
    waiting_on: "Dave / MVE",
    linked_document_id: "doc-fallback-2",
    linked_document_title: "Drainage Observation Log"
  }
];

export const seededDocumentChunks: DocumentChunk[] = [
  {
    id: "chunk-1",
    project_id: seededProject.id,
    document_id: "doc-fallback-1",
    transcript_id: null,
    source_type: "document",
    page_number: 1,
    section_label: "Legal access summary",
    chunk_text:
      "Access Exhibit Index summarizes deed and easement materials assembled to support the project's legal access record. Additional USFS coordination records may still be needed.",
    created_at: new Date().toISOString()
  },
  {
    id: "chunk-2",
    project_id: seededProject.id,
    document_id: "doc-fallback-2",
    transcript_id: null,
    source_type: "document",
    page_number: 1,
    section_label: "Drainage field notes",
    chunk_text:
      "Drainage Observation Log notes culvert observations, road runoff patterns, and follow-up support requested by stormwater review.",
    created_at: new Date().toISOString()
  }
  ,
  {
    id: "chunk-3",
    project_id: seededProject.id,
    document_id: null,
    transcript_id: "transcript-1",
    source_type: "transcript",
    page_number: null,
    section_label: "USFS access coordination call transcript",
    chunk_text:
      "Transcript notes a USFS access coordination call covering gate status observations, access follow-up, and records still needed before the next coordination step.",
    created_at: new Date().toISOString()
  }
];

export const seededMeetingTranscripts: MeetingTranscript[] = [
  {
    id: "transcript-1",
    project_id: seededProject.id,
    title: "USFS access coordination call",
    meeting_date: "2026-05-12",
    participants: "Thomas, USFS representative, Dave Gorman / MVE",
    source: "Zoom upload",
    audio_file_path: null,
    transcript_file_path: null,
    transcript_text:
      "Discussion covered access coordination, gate status observations, and additional records needed before the next USFS follow-up.",
    notes: "Fallback transcript example while Supabase is not configured.",
    created_by_user_id: "demo-owner",
    created_by_email: "team@rampart-range.org",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const seededEvidencePhotos: EvidencePhoto[] = [
  {
    id: "photo-1",
    project_id: seededProject.id,
    title: "Gate approach overview",
    photo_date: "2026-05-06",
    latitude: 38.9221,
    longitude: -104.6182,
    direction_facing: "SE",
    category: "gate",
    file_path: null,
    notes: "Fallback example showing gate approach conditions during access visit.",
    linked_point_id: "fp-1",
    created_by_user_id: "demo-owner",
    created_by_email: "team@rampart-range.org",
    created_at: new Date().toISOString()
  },
  {
    id: "photo-2",
    project_id: seededProject.id,
    title: "Culvert inlet field observation",
    photo_date: "2026-05-10",
    latitude: 38.9223,
    longitude: -104.6184,
    direction_facing: "N",
    category: "culvert",
    file_path: null,
    notes: "Fallback example tied to the culvert inlet observation point.",
    linked_point_id: "fp-3",
    created_by_user_id: "demo-owner",
    created_by_email: "team@rampart-range.org",
    created_at: new Date().toISOString()
  }
];

export const seededRoadCorridor: RoadCorridor = {
  id: "road-corridor-fs0300",
  project_id: seededProject.id,
  name: "Rampart Range Road / FS 0300",
  road_number: "FS 0300",
  alternate_names: ["Rampart Range Road", "Forest Road 300", "NFSR 300"],
  managing_agency: "USDA Forest Service",
  description:
    "Primary corridor used for project access coordination, road-condition tracking, weather risk review, and future LiDAR-derived roadway analytics.",
  min_elevation_ft: 6800,
  max_elevation_ft: 9200,
  length_miles: 19.4,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const seededRoadDataSources: RoadDataSource[] = [
  {
    id: "road-source-usfs",
    provider_key: "usfs_psicc",
    provider_name: "US Forest Service PSICC",
    source_type: "closure",
    authority_level: "authoritative",
    base_url: "https://www.fs.usda.gov/r02/psicc/recreation/rampart-range-recreation-area",
    enabled: true,
    ingestion_method: "http_parse",
    default_refresh_minutes: 360,
    parser_version: "seed-v1",
    terms_notes: "Seeded fallback source until automated ingestion is deployed.",
    last_success_at: new Date("2026-08-13T08:15:00-06:00").toISOString()
  },
  {
    id: "road-source-rrmmc",
    provider_key: "rrmmc",
    provider_name: "Rampart Range Motorized Management Committee",
    source_type: "road_status",
    authority_level: "partner_observation",
    base_url: "https://rampartrange.org/",
    enabled: true,
    ingestion_method: "http_parse",
    default_refresh_minutes: 240,
    parser_version: "seed-v1",
    terms_notes: "Partner observation layer; does not override an active USFS order.",
    last_success_at: new Date("2026-08-13T06:40:00-06:00").toISOString()
  },
  {
    id: "road-source-nws",
    provider_key: "nws",
    provider_name: "National Weather Service",
    source_type: "weather",
    authority_level: "authoritative_weather",
    base_url: "https://api.weather.gov/",
    enabled: true,
    ingestion_method: "api",
    default_refresh_minutes: 60,
    parser_version: "seed-v1",
    terms_notes: "Weather source for observations, forecasts, and alerts.",
    last_success_at: new Date("2026-08-13T09:05:00-06:00").toISOString()
  },
  {
    id: "road-source-cotrex",
    provider_key: "cotrex",
    provider_name: "Colorado Trail Explorer",
    source_type: "community_conditions",
    authority_level: "state_community",
    base_url: "https://trails.colorado.gov/",
    enabled: false,
    ingestion_method: "manual_or_api",
    default_refresh_minutes: 720,
    parser_version: "seed-v1",
    terms_notes: "Second-tier map and condition evidence source only."
  }
];

export const seededRoadWeatherLocations: RoadWeatherLocation[] = [
  {
    id: "road-weather-lower",
    corridor_id: seededRoadCorridor.id,
    name: "3245 Rampart Range",
    latitude: 38.9209,
    longitude: -104.6179,
    elevation_ft: 6970,
    station_identifier: "RAMPART-LOWER",
    source: "nws",
    active: true
  },
  {
    id: "road-weather-mid",
    corridor_id: seededRoadCorridor.id,
    name: "Rampart Reservoir vicinity",
    latitude: 39.0794,
    longitude: -104.9632,
    elevation_ft: 9100,
    station_identifier: "RAMPART-MID",
    source: "nws",
    active: true
  }
];

export const seededWeatherObservations: WeatherObservation[] = [
  {
    id: "road-weather-observation-1",
    location_id: seededRoadWeatherLocations[0].id,
    source_id: "road-source-nws",
    observed_at: new Date("2026-08-13T09:00:00-06:00").toISOString(),
    temperature_f: 58,
    relative_humidity_percent: 45,
    wind_speed_mph: 9,
    wind_gust_mph: 18,
    precipitation_24h_in: 0.05,
    weather_description: "Partly cloudy",
    fetched_at: new Date("2026-08-13T09:05:00-06:00").toISOString()
  }
];

export const seededWeatherForecasts: WeatherForecast[] = [
  {
    id: "road-weather-forecast-1",
    location_id: seededRoadWeatherLocations[0].id,
    source_id: "road-source-nws",
    forecast_generated_at: new Date("2026-08-13T08:30:00-06:00").toISOString(),
    period_start: new Date("2026-08-13T12:00:00-06:00").toISOString(),
    period_end: new Date("2026-08-13T18:00:00-06:00").toISOString(),
    temperature_f: 72,
    precipitation_probability: 25,
    snowfall_inches: 0,
    wind_speed_mph: 12,
    wind_gust_mph: 24,
    short_forecast: "Isolated thunderstorms after 2 PM",
    detailed_forecast: "Warm with a slight chance of afternoon storms and gusty outflow winds."
  }
];

export const seededRoadAlerts: RoadClosureAlert[] = [
  {
    id: "road-alert-1",
    corridor_id: seededRoadCorridor.id,
    source_id: "road-source-usfs",
    alert_type: "seasonal_closure",
    severity: "info",
    title: "Seasonal winter closure pattern tracked",
    description:
      "Seeded reminder that historical winter closure behavior should be monitored from USFS notices rather than inferred from partner reports.",
    active: false,
    source_url: "https://www.fs.usda.gov/r02/psicc/recreation/rampart-range-recreation-area"
  },
  {
    id: "road-alert-2",
    corridor_id: seededRoadCorridor.id,
    source_id: "road-source-nws",
    alert_type: "thunderstorm",
    severity: "watch",
    title: "Afternoon thunderstorm risk",
    description: "Weather-driven caution only. This is not an official road closure or travel authorization notice.",
    effective_at: new Date("2026-08-13T12:00:00-06:00").toISOString(),
    expires_at: new Date("2026-08-13T18:00:00-06:00").toISOString(),
    active: true,
    source_url: "https://api.weather.gov/"
  }
];

export const seededRoadDailySnapshots: RoadDailySnapshot[] = [
  {
    id: "road-snapshot-2026-08-13",
    corridor_id: seededRoadCorridor.id,
    snapshot_date: "2026-08-13",
    consolidated_status: "open",
    gate_status: "open",
    status_confidence: 0.74,
    status_source: "rrmmc + seeded fallback",
    min_temperature_f: 49,
    max_temperature_f: 72,
    precipitation_24h_in: 0.05,
    snowfall_24h_in: 0,
    max_wind_gust_mph: 24,
    active_weather_alerts: 1,
    active_usfs_alerts: 0,
    road_condition_score: 81,
    weather_risk_score: 39,
    overall_access_risk: "moderate",
    summary: "No active USFS closure detected in fallback data. Weather risk is elevated slightly by possible afternoon thunderstorms."
  }
];

export const seededRoadCurrentStatus: RoadCurrentStatus = {
  corridor_id: seededRoadCorridor.id,
  road_name: seededRoadCorridor.name,
  official_status: "unknown",
  official_status_time: new Date("2026-08-13T08:15:00-06:00").toISOString(),
  official_status_source: "USFS PSICC fallback seed",
  partner_status: "open",
  partner_status_time: new Date("2026-08-13T06:40:00-06:00").toISOString(),
  gate_status: "open",
  active_usfs_alert_count: 0,
  active_weather_alert_count: 1,
  temperature_f: 58,
  weather_description: "Partly cloudy",
  wind_mph: 9,
  wind_gust_mph: 18,
  forecast_snow_inches: 0,
  forecast_precip_probability: 25,
  latest_condition_report: "Recent portal observation notes rutting near a drainage crossing but no closure evidence.",
  overall_access_risk: "moderate",
  last_updated: new Date("2026-08-13T09:05:00-06:00").toISOString()
};

export const seededRoadWeatherSnapshots: RoadWeatherLocationSnapshot[] = seededRoadWeatherLocations.map((location) => ({
  location,
  latestObservation: seededWeatherObservations.find((observation) => observation.location_id === location.id) ?? null,
  nextForecast: seededWeatherForecasts.find((forecast) => forecast.location_id === location.id) ?? null
}));

export const seededRoadConditionReports: RoadConditionReport[] = [
  {
    id: "road-report-1",
    corridor_id: seededRoadCorridor.id,
    report_source: "portal_user",
    reported_by: "demo-owner",
    observed_at: new Date("2026-08-12T15:30:00-06:00").toISOString(),
    condition: "Caution near drainage crossing",
    surface_condition: "rutted",
    mud_severity: "low",
    snow_severity: "none",
    rut_severity: "moderate",
    washout: false,
    fallen_tree: false,
    standing_water: false,
    erosion: true,
    passability: "high_clearance_recommended",
    recommended_vehicle: "High-clearance SUV or pickup",
    description: "Minor rutting and shoulder erosion near the culvert crossing. Passable, but low-clearance vehicles should use caution after storms.",
    latitude: 38.9223,
    longitude: -104.6184,
    photo_id: "photo-2",
    verified: true,
    created_at: new Date("2026-08-12T16:10:00-06:00").toISOString()
  },
  {
    id: "road-report-2",
    corridor_id: seededRoadCorridor.id,
    report_source: "portal_user",
    reported_by: "demo-owner",
    observed_at: new Date("2026-08-10T10:15:00-06:00").toISOString(),
    condition: "Afternoon thunderstorm runoff",
    surface_condition: "damp",
    mud_severity: "moderate",
    snow_severity: "none",
    rut_severity: "low",
    washout: false,
    fallen_tree: false,
    standing_water: true,
    erosion: false,
    passability: "4wd_recommended",
    recommended_vehicle: "4WD recommended if additional rain arrives",
    description: "Runoff pooled briefly at the inside turn. Still passable, but softer shoulders were forming by late afternoon.",
    latitude: 38.9241,
    longitude: -104.6202,
    verified: false,
    created_at: new Date("2026-08-10T10:40:00-06:00").toISOString()
  }
];

export const seededRoadFieldMeasurements: RoadFieldMeasurement[] = [
  {
    id: "road-measurement-1",
    corridor_id: seededRoadCorridor.id,
    measurement_type: "road_width",
    measured_at: new Date("2026-08-12T15:20:00-06:00").toISOString(),
    value: 18.4,
    units: "ft",
    latitude: 38.9223,
    longitude: -104.6184,
    elevation_ft: 6942.1,
    source_equipment: "3DMakerPro Eagle Max",
    source_point_id: "fp-3",
    notes: "LiDAR-derived roadway width near the culvert crossing pinch point.",
    created_at: new Date("2026-08-12T16:12:00-06:00").toISOString()
  },
  {
    id: "road-measurement-2",
    corridor_id: seededRoadCorridor.id,
    measurement_type: "rut_depth",
    measured_at: new Date("2026-08-12T15:32:00-06:00").toISOString(),
    value: 0.42,
    units: "ft",
    latitude: 38.9223,
    longitude: -104.6184,
    elevation_ft: 6941.8,
    source_equipment: "Field observation + LiDAR check",
    source_point_id: "fp-3",
    notes: "Observed rut depth beside the drainage crossing after runoff.",
    created_at: new Date("2026-08-12T16:15:00-06:00").toISOString()
  },
  {
    id: "road-measurement-3",
    corridor_id: seededRoadCorridor.id,
    measurement_type: "grade_percent",
    measured_at: new Date("2026-08-10T10:00:00-06:00").toISOString(),
    value: 8.6,
    units: "%",
    latitude: 38.9241,
    longitude: -104.6202,
    elevation_ft: 6954.2,
    source_equipment: "3DMakerPro Eagle Max",
    notes: "Short uphill segment grade captured from corridor scan preview alignment.",
    created_at: new Date("2026-08-10T10:41:00-06:00").toISOString()
  }
];

export const seededLprCameras: LprCamera[] = [
  {
    id: "lpr-camera-1",
    project_id: seededProject.id,
    name: "North Gate Solar LPR",
    manufacturer: "Milesight",
    model: "Solar ANPR",
    latitude: 38.9218,
    longitude: -104.6179,
    elevation_ft: 6970,
    install_location: "Primary ingress near 3245 Rampart Range Rd",
    direction_facing: "northbound ingress / southbound egress",
    connectivity: "wifi",
    power_source: "solar",
    solar_panel_watts: 200,
    battery_wh: 962,
    integration_type: "http_notification",
    active: true,
    last_seen_at: "2026-08-13T14:05:00-06:00",
    created_at: "2026-08-12T09:00:00-06:00"
  }
];

export const seededLprEvents: LprEvent[] = [
  {
    id: "lpr-event-1",
    camera_id: "lpr-camera-1",
    observed_at: "2026-08-13T07:14:00-06:00",
    plate_text: "ABC1234",
    plate_confidence: 0.94,
    plate_state: "CO",
    vehicle_type: "pickup",
    vehicle_make: "Ford",
    vehicle_model: "F-150",
    vehicle_color: "white",
    direction: "inbound",
    image_path: null,
    plate_crop_path: null,
    event_latitude: 38.9218,
    event_longitude: -104.6179,
    raw_payload: {
      source: "fallback",
      recognized_at_edge: true
    },
    created_at: "2026-08-13T07:14:03-06:00"
  },
  {
    id: "lpr-event-2",
    camera_id: "lpr-camera-1",
    observed_at: "2026-08-13T11:52:00-06:00",
    plate_text: "XYZ9876",
    plate_confidence: 0.89,
    plate_state: "CO",
    vehicle_type: "suv",
    vehicle_make: "Toyota",
    vehicle_model: "4Runner",
    vehicle_color: "gray",
    direction: "outbound",
    image_path: null,
    plate_crop_path: null,
    event_latitude: 38.9218,
    event_longitude: -104.6179,
    raw_payload: {
      source: "fallback",
      recognized_at_edge: true
    },
    created_at: "2026-08-13T11:52:02-06:00"
  },
  {
    id: "lpr-event-3",
    camera_id: "lpr-camera-1",
    observed_at: "2026-08-12T18:20:00-06:00",
    plate_text: "TEST246",
    plate_confidence: 0.91,
    plate_state: "CO",
    vehicle_type: "car",
    vehicle_make: "Subaru",
    vehicle_model: "Outback",
    vehicle_color: "blue",
    direction: "inbound",
    image_path: null,
    plate_crop_path: null,
    event_latitude: 38.9218,
    event_longitude: -104.6179,
    raw_payload: {
      source: "fallback",
      recognized_at_edge: true
    },
    created_at: "2026-08-12T18:20:02-06:00"
  }
];

export const seededLprDailyStats: LprDailyStat[] = [
  {
    id: "lpr-stat-1",
    camera_id: "lpr-camera-1",
    stat_date: "2026-08-13",
    total_vehicles: 12,
    unique_plates: 9,
    inbound_count: 7,
    outbound_count: 5,
    first_vehicle_at: "2026-08-13T06:48:00-06:00",
    last_vehicle_at: "2026-08-13T15:09:00-06:00"
  },
  {
    id: "lpr-stat-2",
    camera_id: "lpr-camera-1",
    stat_date: "2026-08-12",
    total_vehicles: 18,
    unique_plates: 13,
    inbound_count: 10,
    outbound_count: 8,
    first_vehicle_at: "2026-08-12T06:31:00-06:00",
    last_vehicle_at: "2026-08-12T19:02:00-06:00"
  }
];
