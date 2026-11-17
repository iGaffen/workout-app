/** The brand's custom icon set (src/assets/icons), drawn as images so each SVG keeps its own glow filter. */
const files = import.meta.glob("../assets/icons/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const url = (n: string) => files[`../assets/icons/${n}.svg`];

export type GlyphName =
  | "home" | "routines" | "library" | "progress" | "settings"
  | "tick" | "plus" | "minus" | "close" | "chevron" | "switch" | "edit" | "backup"
  | "move-pull" | "move-push" | "move-press" | "move-curl" | "move-legs" | "move-shoulders"
  | "award-streak" | "award-medal" | "award-week";

export function Glyph({ name, active = false, size = 22, className }: { name: GlyphName; active?: boolean; size?: number; className?: string }) {
  return <img src={url(`${name}-${active ? "active" : "outline"}`)} width={size} height={size} alt="" aria-hidden="true" className={className} draggable={false} />;
}

const brand = import.meta.glob("../assets/brand/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
export const brandUrl = (n: string) => brand[`../assets/brand/${n}.svg`];

/** Gold monogram; below 48 px the simplified mark is used, as the brand rules say. */
export function Monogram({ size = 36 }: { size?: number }) {
  return <img src={brandUrl(size < 48 ? "monogram-small" : "monogram-gold")} width={size} height={size} alt="AM" className="monogram" />;
}
