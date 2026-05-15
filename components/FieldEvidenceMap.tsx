"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { FieldPoint } from "@/lib/types";

const layerLabels: Record<string, string> = {
  monument: "Monuments",
  culvert_inlet: "Culverts",
  culvert_outlet: "Culverts",
  berm: "Berms",
  swale: "Drainage",
  ditch: "Drainage",
  road_edge: "Road / access",
  gate: "Gates",
  turnout: "Road / access",
  driveway: "Road / access",
  building_corner: "Other",
  control: "Monuments",
  photo_station: "Photo stations",
  other: "Other"
};

const layerColors: Record<string, string> = {
  Monuments: "#d97706",
  Culverts: "#2563eb",
  Berms: "#7c3aed",
  Drainage: "#0f766e",
  "Road / access": "#be123c",
  "Photo stations": "#16a34a",
  Gates: "#1f2937",
  Other: "#64748b"
};

export function FieldEvidenceMap({ fieldPoints }: { fieldPoints: FieldPoint[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [selectedLayers, setSelectedLayers] = useState<string[]>(() =>
    Array.from(new Set(fieldPoints.map((point) => layerLabels[point.point_type] ?? "Other")))
  );

  const availableLayers = useMemo(
    () => Array.from(new Set(fieldPoints.map((point) => layerLabels[point.point_type] ?? "Other"))),
    [fieldPoints]
  );

  const visiblePoints = useMemo(
    () =>
      fieldPoints.filter((point) => {
        const layerLabel = layerLabels[point.point_type] ?? "Other";
        return selectedLayers.includes(layerLabel) && point.longitude != null && point.latitude != null;
      }),
    [fieldPoints, selectedLayers]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-104.61773785, 38.92176425],
      zoom: 13
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstanceRef.current = map;

    map.on("load", () => {
      map.addSource("field-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "field-points-circles",
        type: "circle",
        source: "field-points",
        paint: {
          "circle-radius": 6,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5
        }
      });

      map.on("click", "field-points-circles", (event) => {
        const feature = event.features?.[0];

        if (!feature || feature.geometry.type !== "Point") {
          return;
        }

        const properties = feature.properties ?? {};
        const coordinates = feature.geometry.coordinates.slice() as [number, number];

        new maplibregl.Popup({ closeButton: true })
          .setLngLat(coordinates)
          .setHTML(
            `<div style="min-width:220px">
              <strong>${properties.point_name ?? "Unnamed point"}</strong><br/>
              <span>${properties.point_type ?? "Unknown type"}</span><br/>
              <span>Coordinates: ${properties.latitude ?? "—"}, ${properties.longitude ?? "—"}</span><br/>
              <span>Elevation: ${properties.elevation ?? "—"}</span><br/>
              <span>Confidence: ${properties.confidence ?? "—"}</span><br/>
              <span>Description: ${properties.description ?? "—"}</span><br/>
              <span>Collected: ${properties.collected_at ?? "—"}</span>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "field-points-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "field-points-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const source = map.getSource("field-points") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = visiblePoints.map((point) => {
      const layerLabel = layerLabels[point.point_type] ?? "Other";
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [point.longitude as number, point.latitude as number]
        },
        properties: {
          point_name: point.point_name,
          point_type: point.point_type,
          latitude: point.latitude ?? "—",
          longitude: point.longitude ?? "—",
          elevation: point.elevation ?? "—",
          confidence: point.confidence,
          description: point.description ?? "—",
          collected_at: point.collected_at ? new Date(point.collected_at).toLocaleString() : "—",
          color: layerColors[layerLabel] ?? "#64748b"
        }
      };
    });

    source.setData({
      type: "FeatureCollection",
      features
    });

    if (features.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    }
  }, [visiblePoints]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {availableLayers.map((layer) => {
          const active = selectedLayers.includes(layer);
          return (
            <button
              key={layer}
              type="button"
              onClick={() =>
                setSelectedLayers((current) =>
                  current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]
                )
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-pine text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {layer}
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-card">
        <div ref={mapRef} className="h-[520px] w-full" />
      </div>
    </div>
  );
}
