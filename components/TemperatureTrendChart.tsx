import { TemperaturePoint, TemperatureRange } from "@/lib/road-temperature";

type TemperatureTrendChartProps = {
  points: TemperaturePoint[];
  range: TemperatureRange;
};

function labelForRange(range: TemperatureRange) {
  switch (range) {
    case "day":
      return "24 hour average";
    case "month":
      return "30 day average";
    case "week":
    default:
      return "7 day average";
  }
}

export function TemperatureTrendChart({ points, range }: TemperatureTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        No temperature history is available yet for the selected range.
      </div>
    );
  }

  const temperatures = points.map((point) => point.averageTempF);
  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const span = Math.max(max - min, 1);
  const width = 720;
  const height = 220;
  const paddingX = 24;
  const paddingY = 20;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const linePoints = points
    .map((point, index) => {
      const x = paddingX + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingY + ((max - point.averageTempF) / span) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const average = Number((temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length).toFixed(1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{labelForRange(range)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Average {average} F | Min {min.toFixed(1)} F | Max {max.toFixed(1)} F
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{points.length} chart points</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Temperature trend chart">
          <defs>
            <linearGradient id="temperature-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.03" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingY + ratio * plotHeight;
            const temp = (max - ratio * span).toFixed(1);

            return (
              <g key={ratio}>
                <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="#dbe4ea" strokeDasharray="4 6" />
                <text x={4} y={y + 4} fontSize="11" fill="#64748b">
                  {temp} F
                </text>
              </g>
            );
          })}

          <polyline
            points={`${paddingX},${height - paddingY} ${linePoints} ${width - paddingX},${height - paddingY}`}
            fill="url(#temperature-fill)"
            stroke="none"
          />
          <polyline points={linePoints} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {points.map((point, index) => {
            const x = paddingX + (index / Math.max(points.length - 1, 1)) * plotWidth;
            const y = paddingY + ((max - point.averageTempF) / span) * plotHeight;

            return (
              <g key={point.key}>
                <circle cx={x} cy={y} r="4" fill="#0f766e" />
                <text x={x} y={height - 2} textAnchor="middle" fontSize="11" fill="#64748b">
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
