const P = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const Icon = {
  today: () => <svg {...P}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  routines: () => <svg {...P}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>,
  library: () => <svg {...P}><path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/></svg>,
  settings: () => <svg {...P}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  bike: () => <svg {...P}><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M15 6h2l1.5 11M5.5 17 9 9h6l-6.5 8H12l3-8"/></svg>,
  stairs: () => <svg {...P}><path d="M3 21h5v-5h5v-5h5V6h3"/></svg>,
  progress: () => <svg {...P}><path d="M3 20h18M5 16l5-5 4 3 6-7"/></svg>,
  home: () => <svg {...P}><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>,
  next: () => <svg {...P}><path d="m9 6 6 6-6 6"/></svg>,
  tick: () => <svg {...P} strokeWidth={3}><path d="m5 12 5 5 9-10"/></svg>,
  up: () => <svg {...P}><path d="m6 15 6-6 6 6"/></svg>,
  down: () => <svg {...P}><path d="m6 9 6 6 6-6"/></svg>,
  grip: () => <svg {...P}><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></svg>,
  close: () => <svg {...P}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  back: () => <svg {...P}><path d="m15 18-6-6 6-6"/></svg>,
};
export function BlockIcon({ name }: { name?: string }) {
  if (name === "bike") return <Icon.bike />;
  if (name === "stairs") return <Icon.stairs />;
  return null;
}
