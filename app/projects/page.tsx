import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { seededProject } from "@/lib/mock-data";

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Projects"
        title="Project index"
        description="The portal currently opens with a single Rampart Range record, and the data model supports additional projects as evidence sets grow."
      />
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">{seededProject.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{seededProject.description}</p>
            <p className="mt-3 text-sm text-slate-500">
              {seededProject.address} • Parcel {seededProject.parcel_number}
            </p>
          </div>
          <Link
            href={`/projects/${seededProject.slug}`}
            className="inline-flex rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
          >
            Open project
          </Link>
        </div>
      </div>
    </div>
  );
}
