'use client';

import { Flame, Minus, Plus } from 'lucide-react';
import ItemVisual from './ItemVisual';
import { useCart } from '@/lib/burnout/store';
import type { Item, SectionKind } from '@/lib/burnout/types';

const TAG_LABEL: Record<string, string> = {
  bestseller: 'Bestseller',
  'must-try': 'Must try',
  'chef-special': "Chef's special",
  new: 'New',
};

export function DietMark({ diet }: { diet: Item['diet'] }) {
  if (!diet) return null;
  const veg = diet === 'veg' || diet === 'vegan';
  return (
    <span
      className="diet-mark"
      style={{ color: veg ? 'var(--veg)' : 'var(--nonveg)' }}
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
    />
  );
}

export function Price({ value, strike }: { value: number; strike?: number | null }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="display text-[17px] text-[var(--text)]">
        ₹{value.toLocaleString('en-IN')}
      </span>
      {strike ? (
        <span className="text-[13px] text-[var(--text-faint)] line-through">
          ₹{strike.toLocaleString('en-IN')}
        </span>
      ) : null}
    </span>
  );
}

export default function ItemRow({
  item,
  kind,
  onOpen,
}: {
  item: Item;
  kind: SectionKind;
  onOpen?: (item: Item) => void;
}) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);

  const mine = lines.filter((l) => l.item_id === item.id);
  const qty = mine.reduce((n, l) => n + l.qty, 0);
  const needsChoices =
    (item.variants?.length ?? 0) > 0 || (item.modifier_groups?.length ?? 0) > 0;

  const out = !item.is_available;
  const hasPhoto = !!item.image_url;

  return (
    <div
      className={`defer-row flex gap-4 border-b border-[var(--border)] py-4 last:border-0 ${
        out ? 'opacity-45' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <DietMark diet={item.diet} />
          {/* only badges we have a label for — tags like `no-suggest` are
              internal flags and must never reach the guest */}
          {item.tags
            .filter((t) => t in TAG_LABEL)
            .slice(0, 1)
            .map((t) => (
              <span
                key={t}
                className="rounded-full border border-[var(--gold)]/35 px-2 py-[2px] text-[10px] font-medium tracking-wide text-[var(--gold)] uppercase"
              >
                {TAG_LABEL[t]}
              </span>
            ))}
        </div>

        <h3 className="display text-[19px] leading-tight text-[var(--text)]">
          {item.name}
        </h3>

        <div className="mt-1.5">
          <Price value={item.price} strike={item.strike_price} />
          {needsChoices && (
            <span className="ml-2 text-[12px] text-[var(--text-faint)]">onwards</span>
          )}
        </div>

        {item.description && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-dim)]">
            {item.description}
          </p>
        )}

        {item.spice_level ? (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--ember)]">
            {Array.from({ length: item.spice_level }).map((_, i) => (
              <Flame key={i} size={11} fill="currentColor" />
            ))}
          </span>
        ) : null}
      </div>

      {/* No invented artwork: an item without a real photo simply has no
          picture, and the Add control moves over to fill the space. */}
      <div
        className={
          hasPhoto
            ? 'relative w-[88px] flex-none'
            : 'flex flex-none items-center self-center'
        }
      >
        {hasPhoto && (
          <ItemVisual
            name={item.name}
            src={item.image_url}
            kind={kind}
            className="size-[88px]"
            sizes="88px"
          />
        )}

        {/* With a photo this sits INSIDE it. An earlier version hung it below
            with -bottom-3; that overflow got clipped by the row's rendering
            containment and the button stopped taking taps entirely. */}
        <div
          className={
            hasPhoto ? 'absolute bottom-1.5 left-1/2 -translate-x-1/2' : ''
          }
        >
          {out ? (
            <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--text-faint)] uppercase">
              Finished
            </span>
          ) : qty === 0 || needsChoices ? (
            <button
              onClick={() => (needsChoices && onOpen ? onOpen(item) : add(item))}
              className="btn-gold px-6 py-2 text-[13px] tracking-wide uppercase"
            >
              Add{needsChoices ? ' +' : ''}
            </button>
          ) : (
            <div className="btn-gold flex items-center gap-1 px-1 py-0.5">
              <button
                onClick={() => dec(mine[0].key)}
                aria-label="One less"
                className="grid size-9 place-items-center"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="min-w-4 text-center text-[14px] font-bold">{qty}</span>
              <button
                onClick={() => inc(mine[0].key)}
                aria-label="One more"
                className="grid size-9 place-items-center"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
