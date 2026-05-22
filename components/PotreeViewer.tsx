"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

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
};

export function PotreeViewer({ tilePath, title }: PotreeViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string>("Waiting for point cloud tiles.");
  const [scriptsReady, setScriptsReady] = useState(false);

  const normalizedTilePath = useMemo(() => `${tilePath ?? ""}`.trim(), [tilePath]);

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
        viewer.fitToScreen();
        setStatus("Point cloud loaded. Use Potree navigation tools to orbit, zoom, and inspect the cloud.");
      });
    } catch (error) {
      console.error("Potree viewer initialization failed", error);
      setStatus("Potree viewer could not be initialized for this scan.");
    }
  }, [normalizedTilePath, scriptsReady, title]);

  return (
    <div className="space-y-3">
      <link rel="stylesheet" href="https://unpkg.com/potree@1.8/build/potree/potree.css" />
      <Script src="https://unpkg.com/potree@1.8/build/potree/potree.js" strategy="afterInteractive" onLoad={() => setScriptsReady(true)} />
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{status}</div>
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
