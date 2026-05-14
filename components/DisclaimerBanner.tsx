import { FULL_DISCLAIMER } from "@/lib/constants";

export function DisclaimerBanner() {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-4 text-sm leading-6 text-amber-950 shadow-sm">
      <strong>Coordination Use Only:</strong> {FULL_DISCLAIMER}
    </div>
  );
}
