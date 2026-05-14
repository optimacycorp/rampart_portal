import { PageHeader } from "@/components/PageHeader";

export default function PhotosPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Photo Evidence"
        title="Photo evidence library"
        description="Organize field photography by category, date, linked point, direction of view, and supporting notes."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {["culvert", "road", "gate", "monument", "general", "fire_access"].map((category) => (
          <div key={category} className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{category}</p>
            <div className="mt-4 aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
