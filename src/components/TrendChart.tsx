import { useRef, useState } from "react";

interface Point { label: string; value: number; n: number }

const W = 294, H = 168, L = 30, R = 10, T = 22, B = 30;
const fmtWeek = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const weeksAgo = (iso: string) => Math.round((Date.now() - Date.parse(iso + "T12:00:00")) / (7 * 86400000));

/** Three clean ticks around the data, on whole-number steps. */
function niceTicks(lo: number, hi: number): number[] {
  for (const step of [1, 2, 5, 10, 20, 50]) {
    const start = Math.floor(lo / step) * step;
    if (start + 2 * step >= hi) return [start, start + step, start + 2 * step];
  }
  const step = Math.ceil((hi - lo) / 2);
  return [Math.floor(lo), Math.floor(lo) + step, Math.floor(lo) + 2 * step];
}

/**
 * One-series trend of weekly averages, built to the dataviz rules in the build pack (§2.11):
 * one axis, no legend (the title names it), area wash, end dot with a direct label, crosshair tooltip, table view.
 */
export function TrendChart({ points, unit, name }: { points: Point[]; unit: string; name: string }) {
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const head = (
    <div className="charthead">
      <div><h3>{name}</h3><p>Weekly average · {unit}</p></div>
      {points.length > 0 && <button className="pill" aria-pressed={table} onClick={() => setTable((x) => !x)}>{table ? "Show chart" : "Show table"}</button>}
    </div>
  );
  if (points.length === 0) return <div className="panel chart">{head}<p className="meta">No entries yet. Log one above.</p></div>;

  if (table) {
    return (
      <div className="panel chart">{head}
        <table className="charttable"><tbody>
          {[...points].reverse().map((p) => <tr key={p.label}><td>Week of {fmtWeek(p.label)}</td><td>{p.value.toFixed(1)} {unit}</td></tr>)}
        </tbody></table>
      </div>
    );
  }

  const vals = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const lo = ticks[0], hi = ticks[2];
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo || 1);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${H - B}L${x(0).toFixed(1)},${H - B}Z`;
  const last = points[points.length - 1];
  const lastI = points.length - 1;

  const pick = (clientX: number) => {
    const r = plotRef.current?.getBoundingClientRect();
    if (!r) return;
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - vx) < Math.abs(x(best) - vx)) best = i; });
    setHover(best);
  };
  const h = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max((x(hover) / W) * 100, 18), 82) : 0;

  return (
    <div className="panel chart">
      {head}
      <div className="plot" ref={plotRef}
        onPointerDown={(e) => pick(e.clientX)} onPointerMove={(e) => { if (e.pointerType === "mouse" || e.buttons) pick(e.clientX); }}
        onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}, weekly averages over ${points.length} weeks, latest ${last.value.toFixed(1)} ${unit}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
              <text className="tick" x={0} y={y(t) + 4}>{t}</text>
            </g>
          ))}
          {points.length > 1 && <path className="area" d={area} />}
          {points.length > 1 && <path className="line" d={line} />}
          {h && hover !== null && <line className="cross" x1={x(hover)} x2={x(hover)} y1={T - 6} y2={H - B} />}
          {h && hover !== null && hover !== lastI && <circle className="end" cx={x(hover)} cy={y(h.value)} r={5} />}
          <circle className="end" cx={x(lastI)} cy={y(last.value)} r={5} />
          <text className="endlabel" x={Math.min(x(lastI), W - R)} y={y(last.value) - 12} textAnchor={points.length === 1 ? "middle" : "end"}>{last.value.toFixed(1)} {unit}</text>
          <text className="tick" x={x(0)} y={H - 8} textAnchor={points.length === 1 ? "middle" : "start"}>{points.length === 1 ? (weeksAgo(points[0].label) === 0 ? "This week" : fmtWeek(points[0].label)) : `${weeksAgo(points[0].label) || 1} weeks ago`}</text>
          {points.length > 1 && <text className="tick" x={W - R} y={H - 8} textAnchor="end">{weeksAgo(last.label) === 0 ? "This week" : fmtWeek(last.label)}</text>}
        </svg>
        {h && hover !== null && <div className="tooltip" style={{ left: `${tipLeft}%`, transform: "translateX(-50%)" }}>Wk {hover + 1} · {h.value.toFixed(1)} {unit}</div>}
      </div>
    </div>
  );
}
