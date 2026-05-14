import { SHORT_DISCLAIMER } from "@/lib/constants";

export function PortalFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 px-6 py-5 backdrop-blur">
      <p className="text-xs text-slate-500">{SHORT_DISCLAIMER}</p>
    </footer>
  );
}
