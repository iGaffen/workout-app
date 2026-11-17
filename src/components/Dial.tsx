/** The watch dial (build pack §2.1): a gold bezel, minute marks, one gold segment per finished exercise and a lume dot on the next. */
const C = 140;
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

interface Props { done: number; total: number; sub: string; logged: boolean; size?: number }

export function Dial({ done, total, sub, logged, size = 280 }: Props) {
  const all = logged || (total > 0 && done >= total);
  const step = 360 / Math.max(total, 1);
  const lit = logged ? total : done;
  const next = !all && total > 0 ? done : -1;
  const label = logged ? "Session logged" : `${done} of ${total} exercises done`;
  return (
    <svg className="dial" viewBox="0 0 280 280" width={size} height={size} role="img" aria-label={label}>
      <defs>
        <radialGradient id="dialFace" cx="50%" cy="35%" r="75%"><stop offset="0" stopColor="#1D1628" /><stop offset="1" stopColor="#0C0A10" /></radialGradient>
        <linearGradient id="dialGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F6E7BF" /><stop offset="0.5" stopColor="#E3C98F" /><stop offset="1" stopColor="#A8884A" /></linearGradient>
        <filter id="dialBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
        <filter id="lumeBlur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="faceInset"><feOffset dy="2" /><feGaussianBlur stdDeviation="5" result="o" /><feComposite in="SourceGraphic" in2="o" operator="over" /></filter>
      </defs>
      {/* Face with guilloché rings */}
      <circle cx={C} cy={C} r={104} fill="url(#dialFace)" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      {Array.from({ length: 20 }, (_, i) => <circle key={i} cx={C} cy={C} r={4 + i * 5} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={1} />)}
      {/* Bezel */}
      <circle className="bezel" cx={C} cy={C} r={137} fill="none" stroke="url(#dialGold)" strokeWidth={1.2} opacity={all ? 1 : 0.7} />
      <path className={`sweep ${all && !logged ? "play" : ""}`} d={arc(137, -14, 14)} stroke="#FFF6DD" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* Minute marks */}
      {Array.from({ length: 60 }, (_, i) => {
        const hour = i % 5 === 0;
        const [x1, y1] = pt(128, i * 6), [x2, y2] = pt(hour ? 120 : 124, i * 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hour ? "rgba(241,236,247,0.55)" : "rgba(241,236,247,0.22)"} strokeWidth={hour ? 1.6 : 1} />;
      })}
      {/* Segments: gold fills from 12 o'clock in checklist order */}
      {Array.from({ length: total }, (_, i) => {
        const d = arc(108, i * step + 3, (i + 1) * step - 3);
        const on = i < lit;
        return (
          <g key={i}>
            {on && <path d={d} stroke="url(#dialGold)" strokeWidth={9} fill="none" filter="url(#dialBlur)" opacity={all ? 0.9 : 0.5} />}
            <path className="seg-arc" d={d} stroke={on ? "url(#dialGold)" : "rgba(255,255,255,0.08)"} strokeWidth={9} fill="none" strokeLinecap="butt" />
          </g>
        );
      })}
      {/* Lume dot on the next exercise */}
      {next >= 0 && (() => {
        const [x, y] = pt(108, next * step + step / 2);
        return <g><circle cx={x} cy={y} r={7} fill="#8B6CFF" filter="url(#lumeBlur)" /><circle cx={x} cy={y} r={3.5} fill="#C9B4FF" /></g>;
      })()}
      {/* Text */}
      <text x={C} y={112} textAnchor="middle" fontSize={9} letterSpacing={2.5} fill="#A39BB3">GYM DAY</text>
      {logged ? (
        <text key="logged" className="count-swap" x={C} y={158} textAnchor="middle" fontSize={24} fill="#E3C98F">LOGGED</text>
      ) : (
        <text x={C} y={162} textAnchor="middle" fontSize={42} fill={all ? "#E3C98F" : "#F1ECF7"}>
          {done}<tspan fontSize={22} fill="#5E566E">/{total}</tspan>
        </text>
      )}
      <text x={C} y={186} textAnchor="middle" fontSize={13} fill="#A39BB3" style={{ fontFamily: "var(--f-read)" }}>{sub}</text>
    </svg>
  );
}
