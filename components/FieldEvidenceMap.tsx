"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { StyleSpecification } from "maplibre-gl";
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

type BasemapMode = "streets" | "satellite" | "topo3dep";

const basemapOptions: Record<
  BasemapMode,
  {
    label: string;
    style: StyleSpecification;
  }
> = {
  streets: {
    label: "Streets",
    style: {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
      },
      layers: [
        {
          id: "osm-base",
          type: "raster",
          source: "osm"
        }
      ]
    }
  },
  satellite: {
    label: "Satellite",
    style: {
      version: 8,
      sources: {
        usgsImagery: {
          type: "raster",
          tiles: ["https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          attribution:
            'Imagery from <a href="https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map">USGS The National Map</a>'
        }
      },
      layers: [
        {
          id: "usgs-imagery",
          type: "raster",
          source: "usgsImagery"
        }
      ]
    }
  },
  topo3dep: {
    label: "3DEP Topo",
    style: {
      version: 8,
      sources: {
        usgsShadedRelief: {
          type: "raster",
          tiles: ["https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          attribution:
            'Topo and shaded relief from <a href="https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map">USGS The National Map / 3DEP</a>'
        },
        usgsTopo: {
          type: "raster",
          tiles: ["https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          attribution:
            'Topo and shaded relief from <a href="https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map">USGS The National Map / 3DEP</a>'
        }
      },
      layers: [
        {
          id: "usgs-shaded-relief",
          type: "raster",
          source: "usgsShadedRelief",
          paint: {
            "raster-opacity": 1
          }
        },
        {
          id: "usgs-topo-overlay",
          type: "raster",
          source: "usgsTopo",
          paint: {
            "raster-opacity": 0.72
          }
        }
      ]
    }
  }
};

function createFeatureCollection(points: FieldPoint[], selectedLayers: string[]) {
  return {
    type: "FeatureCollection" as const,
    features: points
      .filter((point) => {
        const layerLabel = layerLabels[point.point_type] ?? "Other";
        return selectedLayers.includes(layerLabel) && point.longitude != null && point.latitude != null;
      })
      .map((point) => {
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
            latitude: point.latitude ?? "N/A",
            longitude: point.longitude ?? "N/A",
            elevation: point.elevation ?? "N/A",
            confidence: point.confidence,
            description: point.description ?? "N/A",
            collected_at: point.collected_at ? new Date(point.collected_at).toLocaleString() : "N/A",
            color: layerColors[layerLabel] ?? "#64748b"
          }
        };
      })
  };
}

export function FieldEvidenceMap({ fieldPoints }: { fieldPoints: FieldPoint[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const [basemap, setBasemap] = useState<BasemapMode>("topo3dep");
  const [selectedLayers, setSelectedLayers] = useState<string[]>(() =>
    Array.from(new Set(fieldPoints.map((point) => layerLabels[point.point_type] ?? "Other")))
  );

  const availableLayers = useMemo(
    () => Array.from(new Set(fieldPoints.map((point) => layerLabels[point.point_type] ?? "Other"))),
    [fieldPoints]
  );

  const featureCollection = useMemo(
    () => createFeatureCollection(fieldPoints, selectedLayers),
    [fieldPoints, selectedLayers]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: basemapOptions[basemap].style,
      center: [-104.61773785, 38.92176425],
      zoom: 13
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    hasFittedBoundsRef.current = false;
    map.setStyle(basemapOptions[basemap].style);
  }, [basemap]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const syncMap = () => {
      const existingSource = map.getSource("field-points") as maplibregl.GeoJSONSource | undefined;

      if (!existingSource) {
        map.addSource("field-points", {
          type: "geojson",
          data: featureCollection
        });
      } else {
        existingSource.setData(featureCollection);
      }

      if (!map.getLayer("field-points-circles")) {
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
      }

      if (!map.getLayer("field-points-labels")) {
        map.addLayer({
          id: "field-points-labels",
          type: "symbol",
          source: "field-points",
          layout: {
            "text-field": ["get", "point_name"],
            "text-size": 11,
            "text-offset": [0, 1.25],
            "text-anchor": "top",
            "text-allow-overlap": false
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.2
          }
        });
      }

      if (!hasFittedBoundsRef.current && featureCollection.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        featureCollection.features.forEach((feature) => {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
        hasFittedBoundsRef.current = true;
      }
    };

    const handleClick = (event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
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
            <span>Coordinates: ${properties.latitude ?? "N/A"}, ${properties.longitude ?? "N/A"}</span><br/>
            <span>Elevation: ${properties.elevation ?? "N/A"}</span><br/>
            <span>Confidence: ${properties.confidence ?? "N/A"}</span><br/>
            <span>Description: ${properties.description ?? "N/A"}</span><br/>
            <span>Collected: ${properties.collected_at ?? "N/A"}</span>
          </div>`
        )
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("style.load", syncMap);
    map.on("click", "field-points-circles", handleClick);
    map.on("mouseenter", "field-points-circles", handleMouseEnter);
    map.on("mouseleave", "field-points-circles", handleMouseLeave);

    if (map.isStyleLoaded()) {
      syncMap();
    }

    return () => {
      map.off("style.load", syncMap);
      map.off("click", "field-points-circles", handleClick);
      map.off("mouseenter", "field-points-circles", handleMouseEnter);
      map.off("mouseleave", "field-points-circles", handleMouseLeave);
    };
  }, [featureCollection]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {(["streets", "satellite", "topo3dep"] as BasemapMode[]).map((mode) => {
          const active = basemap === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setBasemap(mode)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {basemapOptions[mode].label}
            </button>
          );
        })}
      </div>
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
