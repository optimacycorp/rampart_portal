"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { StyleSpecification } from "maplibre-gl";
import { useEffect, useRef } from "react";

type LidarScanInsetMapProps = {
  centerLatitude?: number | null;
  centerLongitude?: number | null;
  bboxWest?: number | null;
  bboxSouth?: number | null;
  bboxEast?: number | null;
  bboxNorth?: number | null;
  title: string;
};

const insetStyle: StyleSpecification = {
  version: 8,
  sources: {
    usgsTopo: {
      type: "raster",
      tiles: ["https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution:
        'Topo from <a href="https://www.usgs.gov/faqs/what-are-base-map-services-or-urls-used-national-map">USGS The National Map</a>'
    }
  },
  layers: [
    {
      id: "usgs-topo",
      type: "raster",
      source: "usgsTopo"
    }
  ]
};

export function LidarScanInsetMap({
  centerLatitude,
  centerLongitude,
  bboxWest,
  bboxSouth,
  bboxEast,
  bboxNorth,
  title
}: LidarScanInsetMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || centerLatitude == null || centerLongitude == null) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: insetStyle,
      center: [centerLongitude, centerLatitude],
      zoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

    map.on("load", () => {
      map.addSource("scan-center", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [centerLongitude, centerLatitude]
              },
              properties: {
                title
              }
            }
          ]
        }
      });

      map.addLayer({
        id: "scan-center-circle",
        type: "circle",
        source: "scan-center",
        paint: {
          "circle-radius": 7,
          "circle-color": "#0f766e",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });

      if (
        bboxWest != null &&
        bboxSouth != null &&
        bboxEast != null &&
        bboxNorth != null
      ) {
        map.addSource("scan-bbox", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [bboxWest, bboxSouth],
                    [bboxEast, bboxSouth],
                    [bboxEast, bboxNorth],
                    [bboxWest, bboxNorth],
                    [bboxWest, bboxSouth]
                  ]]
                },
                properties: {}
              }
            ]
          }
        });

        map.addLayer({
          id: "scan-bbox-fill",
          type: "fill",
          source: "scan-bbox",
          paint: {
            "fill-color": "#0f766e",
            "fill-opacity": 0.12
          }
        });

        map.addLayer({
          id: "scan-bbox-line",
          type: "line",
          source: "scan-bbox",
          paint: {
            "line-color": "#0f766e",
            "line-width": 2
          }
        });

        map.fitBounds(
          [
            [bboxWest, bboxSouth],
            [bboxEast, bboxNorth]
          ],
          { padding: 36, maxZoom: 18 }
        );
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [bboxEast, bboxNorth, bboxSouth, bboxWest, centerLatitude, centerLongitude, title]);

  if (centerLatitude == null || centerLongitude == null) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
        Add center latitude and longitude to render the LiDAR footprint inset map.
      </div>
    );
  }

  return <div ref={mapRef} className="h-64 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100" />;
}
