import { useState } from "react";

interface Point { label: string; value: number; n: number }

const fmtWeek = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Single-series trend of weekly averages. Tap a point to read it. */
export function TrendChart({ points, unit, name }: { points: Point[]; unit: string; name: string }) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0) return <p className="sub">No entries yet.</p>;
  const W = 320, H = 150, L = 36, R = 12, T = 14, B = 26;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(0.5, (hi - lo) * 0.15);
  lo -= pad; hi += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad];
  const cur = sel ?? points.length - 1;
  const first = points[0].value, last = points[points.length - 1].value;
  const diff = last - first;

  return (
    <figure className="trend">
      <figcaption className="trendhead">
        <span className="big">{points[cur].value.toFixed(1)} {unit}</span>
        <span className="sub">{sel === null ? "Latest week" : `Week of ${fmtWeek(points[cur].label)}`} · avg of {points[cur].n} {points[cur].n === 1 ? "entry" : "entries"}</span>
        {points.length > 1 && <span className="sub">{diff === 0 ? "No change" : `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)} ${unit}`} since {fmtWeek(points[0].label)}</span>}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="trendsvg" role="img" aria-label={`${name}, weekly averages, ${points.length} weeks`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text className="axis" x={L - 6} y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text>
          </g>
        ))}
        <text className="axis" x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"}>{fmtWeek(points[0].label)}</text>
        {points.length > 1 && <text className="axis" x={x(points.length - 1)} y={H - 8} textAnchor="end">{fmtWeek(points[points.length - 1].label)}</text>}
        {points.length > 1 && <path className="series" d={line} />}
        {sel !== null && <line className="cross" x1={x(sel)} x2={x(sel)} y1={T} y2={H - B} />}
        {points.map((p, i) => (
          <g key={p.label} onClick={() => setSel(sel === i ? null : i)} className="pt">
            <circle cx={x(i)} cy={y(p.value)} r="14" fill="transparent" />
            <circle className={`dot ${i === cur ? "on" : ""}`} cx={x(i)} cy={y(p.value)} r={i === cur ? 5 : 4} />
          </g>
        ))}
      </svg>
      <details className="table">
        <summary>Show as table</summary>
        <table><thead><tr><th>Week of</th><th>Average</th><th>Entries</th></tr></thead>
          <tbody>{[...points].reverse().map((p) => <tr key={p.label}><td>{fmtWeek(p.label)}</td><td>{p.value.toFixed(1)} {unit}</td><td>{p.n}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}
