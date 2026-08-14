"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { seededProject } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: `/projects/${seededProject.slug}/documents`, label: "Documents" },
  { href: `/projects/${seededProject.slug}/plans`, label: "Plans" },
  { href: `/projects/${seededProject.slug}/comments`, label: "Comments" },
  { href: `/projects/${seededProject.slug}/map`, label: "Map" },
  { href: `/projects/${seededProject.slug}/road`, label: "Road" },
  { href: `/projects/${seededProject.slug}/security`, label: "Road Security" },
  { href: `/projects/${seededProject.slug}/field-points`, label: "Field Points" },
  { href: `/projects/${seededProject.slug}/lidar`, label: "LiDAR" },
  { href: `/projects/${seededProject.slug}/culverts`, label: "Culverts" },
  { href: `/projects/${seededProject.slug}/access-log`, label: "Access Log" },
  { href: `/projects/${seededProject.slug}/transcripts`, label: "Transcripts" },
  { href: `/projects/${seededProject.slug}/photos`, label: "Photos" },
  { href: `/projects/${seededProject.slug}/exports`, label: "Exports" }
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href as Route}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-pine text-white shadow-sm"
                : "bg-white/70 text-slate-700 hover:bg-white hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
