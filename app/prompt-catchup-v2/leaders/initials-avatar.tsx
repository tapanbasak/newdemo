/** Derive up to two uppercase initials from a display name. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable hue from a name so each contributor keeps a consistent avatar colour. */
function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

/** Coloured circle with the contributor's initials (podium cards). */
export function InitialsAvatar({ name }: { name: string }) {
  const hue = hueFromName(name);
  return (
    <div
      className="pcu-ldr-avatar"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 75% 62%), hsl(${(hue + 28) % 360} 70% 48%))`,
      }}
      aria-hidden="true"
    >
      {initialsFromName(name)}
    </div>
  );
}
