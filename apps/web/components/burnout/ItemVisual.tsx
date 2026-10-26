import Image from 'next/image';
import type { SectionKind } from '@/lib/burnout/types';

/**
 * Every dish gets a visual, photo or not.
 * With no image we generate a deterministic ember-toned gradient plus a
 * monogram — so a menu with 4 photos and 40 items still looks designed
 * instead of half-finished.
 */

const PALETTES: [string, string, string][] = [
  ['#FF6A1F', '#E5261C', '#7A1208'],
  ['#F2C14E', '#FF7A33', '#8C2F0B'],
  ['#FF8A3D', '#C2160F', '#3D0A05'],
  ['#FFB03A', '#F2570F', '#6B1405'],
  ['#FF5A1F', '#A3120C', '#2A0705'],
  ['#FFD27A', '#FF6A1F', '#5C1206'],
];

const GLYPH: Record<SectionKind, string> = {
  combo: 'M', food: 'F', chakhana: 'C', hookah: 'H', drinks: 'D', dessert: 'S',
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function ItemVisual({
  name,
  src,
  kind = 'food',
  className = '',
  rounded = 'rounded-2xl',
  sizes = '96px',
  priority = false,
}: {
  name: string;
  src?: string | null;
  kind?: SectionKind;
  className?: string;
  rounded?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${rounded} ${className}`}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          // photos uploaded in the POS come through its /api proxy as they are
          unoptimized={src.startsWith('/api/')}
          className="object-cover"
        />
      </div>
    );
  }

  const h = hash(name);
  const [a, b, c] = PALETTES[h % PALETTES.length];
  const angle = 100 + (h % 60);
  const initials = name
    .replace(/[^a-zA-Z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || GLYPH[kind];

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{ background: `linear-gradient(${angle}deg, ${a}, ${b} 55%, ${c})` }}
      aria-hidden
    >
      {/* soft flare so the block reads as lit, not flat */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at ${20 + (h % 50)}% 15%, rgba(255,255,255,0.42), transparent 62%)`,
        }}
      />
      <div className="grain absolute inset-0 opacity-[0.16] mix-blend-overlay" />
      <span
        className="display absolute inset-0 grid place-items-center text-white/85 select-none"
        style={{ fontSize: 'min(42%, 3rem)', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}
      >
        {initials}
      </span>
    </div>
  );
}
