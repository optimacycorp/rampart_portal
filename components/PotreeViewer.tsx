"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { FieldPoint } from "@/lib/types";

declare global {
  interface Window {
    Potree?: {
      Viewer: new (element: HTMLElement) => {
        setEDLEnabled: (enabled: boolean) => void;
        setFOV: (value: number) => void;
        setPointBudget: (value: number) => void;
        setBackground: (value: string) => void;
        fitToScreen: () => void;
        scene: {
          addPointCloud: (pointCloud: unknown) => void;
          addAnnotation?: (position: [number, number, number], options: Record<string, unknown>) => void;
          view: { position?: unknown };
        };
      };
      PointSizeType?: { ADAPTIVE?: unknown };
      loadPointCloud: (url: string, name: string, callback: (event: { pointcloud: { material?: Record<string, unknown> } }) => void) => void;
    };
  }
}

type PotreeViewerProps = {
  tilePath?: string | null;
  title: string;
  fieldPoints?: FieldPoint[];
};

const overlayTypeLabels: Record<string, string> = {
  monument: "Monuments",
  culvert_inlet: "Culvert inlets",
  culvert_outlet: "Culvert outlets",
  berm: "Berms",
  swale: "Swales",
  ditch: "Ditches",
  road_edge: "Road edges",
  gate: "Gates",
  turnout: "Turnouts",
  photo_station: "Photo stations"
};

const overlayTypeColors: Record<string, string> = {
  monument: "#d97706",
  culvert_inlet: "#2563eb",
  culvert_outlet: "#1d4ed8",
  berm: "#7c3aed",
  swale: "#0f766e",
  ditch: "#0d9488",
  road_edge: "#be123c",
  gate: "#1f2937",
  turnout: "#475569",
  photo_station: "#16a34a"
};

function buildAnnotationDescription(point: FieldPoint) {
  const lines = [
    `<strong>${point.point_name}</strong>`,
    `Type: ${point.point_type}`,
    `Easting / northing: ${point.easting ?? "N/A"} / ${point.northing ?? "N/A"}`,
    `Elevation: ${point.elevation ?? "N/A"}`,
    `Confidence: ${point.confidence ?? "N/A"}`,
    `Collection method: ${point.collection_method ?? "N/A"}`,
    `Source equipment: ${point.source_equipment ?? "N/A"}`,
    `Description: ${point.description ?? "N/A"}`,
    `Linked photo/document: ${point.photo_document_id ?? "N/A"}`
  ];

  return lines.join("<br/>");
}

export function PotreeViewer({ tilePath, title, fieldPoints = [] }: PotreeViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string>("Waiting for point cloud tiles.");
  const [scriptsReady, setScriptsReady] = useState(false);

  const normalizedTilePath = useMemo(() => `${tilePath ?? ""}`.trim(), [tilePath]);
  const availableOverlayTypes = useMemo(
    () =>
      Array.from(
        new Set(
          fieldPoints
            .map((point) => point.point_type)
            .filter((pointType) => pointType in overlayTypeLabels)
        )
      ),
    [fieldPoints]
  );
  const [selectedOverlayTypes, setSelectedOverlayTypes] = useState<string[]>([]);

  useEffect(() => {
    setSelectedOverlayTypes(availableOverlayTypes);
  }, [availableOverlayTypes]);

  const activeFieldPoints = useMemo(
    () =>
      fieldPoints.filter(
        (point) =>
          selectedOverlayTypes.includes(point.point_type) &&
          point.easting != null &&
          point.northing != null
      ),
    [fieldPoints, selectedOverlayTypes]
  );

  useEffect(() => {
    if (!scriptsReady || !containerRef.current || !normalizedTilePath || !window.Potree) {
      return;
    }

    const container = containerRef.current;
    container.innerHTML = "";

    try {
      const viewer = new window.Potree.Viewer(container);
      viewer.setEDLEnabled(true);
      viewer.setFOV(60);
      viewer.setPointBudget(1_500_000);
      viewer.setBackground("gradient");

      window.Potree.loadPointCloud(normalizedTilePath, title, (event) => {
        const pointcloud = event.pointcloud;

        if (pointcloud?.material && window.Potree?.PointSizeType?.ADAPTIVE) {
          pointcloud.material.pointSizeType = window.Potree.PointSizeType.ADAPTIVE;
          pointcloud.material.size = 1.2;
        }

        viewer.scene.addPointCloud(pointcloud);

        if (viewer.scene.addAnnotation) {
          activeFieldPoints.forEach((point) => {
            const color = overlayTypeColors[point.point_type] ?? "#0f172a";

            viewer.scene.addAnnotation?.(
              [
                point.easting as number,
                point.northing as number,
                point.elevation ?? 0
              ],
              {
                title: `<span style="color:${color}">${point.point_name}</span>`,
                description: buildAnnotationDescription(point)
              }
            );
          });
        }

        viewer.fitToScreen();
        setStatus(
          activeFieldPoints.length > 0
            ? `Point cloud loaded with ${activeFieldPoints.length} field-point overlays. Use the type toggles to reduce clutter.`
            : "Point cloud loaded. No compatible field-point overlays are currently active for this scan."
        );
      });
    } catch (error) {
      console.error("Potree viewer initialization failed", error);
      setStatus("Potree viewer could not be initialized for this scan.");
    }
  }, [activeFieldPoints, normalizedTilePath, scriptsReady, title]);

  return (
    <div className="space-y-3">
      <link rel="stylesheet" href="https://unpkg.com/potree@1.8/build/potree/potree.css" />
      <Script src="https://unpkg.com/potree@1.8/build/potree/potree.js" strategy="afterInteractive" onLoad={() => setScriptsReady(true)} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{status}</div>
      {availableOverlayTypes.length > 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {availableOverlayTypes.map((pointType) => {
              const active = selectedOverlayTypes.includes(pointType);

              return (
                <button
                  key={pointType}
                  type="button"
                  onClick={() =>
                    setSelectedOverlayTypes((current) =>
                      current.includes(pointType)
                        ? current.filter((value) => value !== pointType)
                        : [...current, pointType]
                    )
                  }
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "text-white" : "bg-slate-100 text-slate-700"
                  }`}
                  style={active ? { backgroundColor: overlayTypeColors[pointType] ?? "#0f172a" } : undefined}
                >
                  {overlayTypeLabels[pointType]}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Imported Emlid and field evidence points are injected as Potree annotations when their coordinate system and projected coordinates match the scan.
          </p>
        </div>
      ) : null}
      {normalizedTilePath ? (
        <div ref={containerRef} className="h-[36rem] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950" />
      ) : (
        <div className="flex h-[22rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
          Add a Potree tile path or public <code className="mx-1">cloud.js</code> URL to load a live point cloud viewer for this scan.
        </div>
      )}
    </div>
  );
}
