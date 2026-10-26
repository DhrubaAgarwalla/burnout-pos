'use client';

import { useState } from 'react';

import { Check, Flame, Minus, Plus, Sparkles, X } from 'lucide-react';
import { useCart } from '@/lib/burnout/store';
import { FLAVOUR_HEROES } from '@/lib/burnout/menu';
import type { CartLine, Item, Modifier, ModifierGroup, Variant } from '@/lib/burnout/types';

/**
 * The options sheet for any item that has choices — sheesha type +
 * flavours + base, extra butter on a bread, and whatever gets added
 * later. Renders every modifier group generically from its own
 * min_select / max_select rules, so a new group needs no new code.
 */
/**
 * Label for the disabled button, naming what's still missing.
 * A group already phrased as an instruction ("Choose your flavour") is used
 * as-is — prefixing it gave "Pick choose your flavour".
 */
function promptFor(groupName: string) {
  return /^(choose|pick|select)\b/i.test(groupName)
    ? groupName
    : `Pick ${groupName.toLowerCase()}`;
}

export default function ItemSheet({
  item,
  open,
  onClose,
  onAdd,
}: {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  /** staff screens building an order collect the choice here instead of the guest's cart */
  onAdd?: (item: Item, variant: Variant | null, mods: CartLine['modifiers'], qty: number) => void;
}) {
  const add = useCart((s) => s.add);

  const variants = item?.variants ?? [];
  const groups = [...(item?.modifier_groups ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const [variantId, setVariantId] = useState<string | null>(null);
  // group id -> chosen modifier ids
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  // reset when a different item is opened
  const [prevItem, setPrevItem] = useState(item);
  if (item !== prevItem) {
    setPrevItem(item);
    setVariantId(null);
    setPicked({});
    setQty(1);
  }

  const variant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;

  const chosenIn = (g: ModifierGroup) =>
    (g.modifiers ?? []).filter((m) => (picked[g.id] ?? []).includes(m.id));

  const toggle = (g: ModifierGroup, id: string) =>
    setPicked((cur) => {
      const now = cur[g.id] ?? [];
      const next = now.includes(id)
        ? now.filter((x) => x !== id)
        : // picking past the limit drops the oldest, so a chip always responds
          [...now, id].slice(-Math.max(1, g.max_select));
      return { ...cur, [g.id]: next };
    });

  const allChosen = groups.flatMap(chosenIn);
  const unit =
    (variant?.price ?? item?.price ?? 0) +
    allChosen.reduce((s, m) => s + m.price, 0);

  if (!item) return null;

  const missing = groups.find((g) => chosenIn(g).length < g.min_select);

  const handleAdd = () => {
    const mods = allChosen.map((m) => ({ id: m.id, name: m.name, price: m.price }));
    if (onAdd) onAdd(item, variant, mods, qty);
    else for (let i = 0; i < qty; i++) add(item, variant, mods);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* above the staff order sheet, which can open it */}
      <div
        className="fade-enter fixed inset-0 z-[56] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="sheet-enter fixed inset-x-0 bottom-0 z-[57] mx-auto max-h-[92dvh] max-w-[620px] overflow-hidden rounded-t-[26px] border-t border-[var(--border-strong)] bg-[var(--bg-2)] sm:border-x"
        role="dialog"
        aria-label={`Options for ${item.name}`}
      >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--border-strong)]" />

            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="min-w-0">
                <h2 className="display text-[26px] leading-tight text-[var(--text)]">
                  {item.section_id === 'sheesha' ? 'Build your Sheesha' : item.name}
                </h2>
                <p className="mt-1 text-[12.5px] text-[var(--text-dim)]">
                  {item.section_id === 'sheesha'
                    ? 'Premium tobacco · quality coals · hygienic & safe'
                    : (item.description ?? 'Pick your options')}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 flex-none place-items-center rounded-full border border-[var(--border)] text-[var(--text-dim)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(92dvh-210px)] overflow-y-auto px-5 pt-5 pb-4">
              {variants.length > 0 && (
                <Group title="Choose a size">
                  <div className="grid grid-cols-2 gap-3">
                    {variants.map((v) => {
                      const on = (variant?.id ?? '') === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setVariantId(v.id)}
                          className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                            on
                              ? 'border-[var(--gold)] bg-[var(--surface-2)] shadow-[var(--glow-soft)]'
                              : 'border-[var(--border)] bg-[var(--surface)]'
                          }`}
                        >
                          {v.name === 'Premium' && (
                            <Sparkles
                              size={14}
                              className="absolute top-3 right-3 text-[var(--gold)]"
                            />
                          )}
                          <div className="display text-[18px] text-[var(--text)]">
                            {v.name}
                          </div>
                          <div className="display mt-1 text-[22px] text-[var(--gold)]">
                            ₹{v.price.toLocaleString('en-IN')}
                          </div>
                          {v.perk && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/12 px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--gold)] uppercase">
                              <Flame size={10} fill="currentColor" />
                              {v.perk}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Group>
              )}

              {groups.map((g) => {
                const chosen = chosenIn(g);
                const optional = g.min_select === 0;
                const available = (g.modifiers ?? []).filter((m) => m.is_available);
                if (available.length === 0) return null;

                return (
                  <Group
                    key={g.id}
                    title={g.name}
                    hint={
                      g.max_select > 1
                        ? `Pick up to ${g.max_select}`
                        : optional
                          ? 'Optional'
                          : 'Pick 1'
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      {optional && g.max_select === 1 && (
                        <button
                          onClick={() => setPicked((c) => ({ ...c, [g.id]: [] }))}
                          className={`rounded-full border px-4 py-2 text-[13px] transition ${
                            chosen.length === 0
                              ? 'border-[var(--gold)] bg-[var(--surface-2)] text-[var(--text)]'
                              : 'border-[var(--border)] text-[var(--text-dim)]'
                          }`}
                        >
                          {g.none_label ?? 'None'}
                        </button>
                      )}
                      {available.map((m) => (
                        <Chip
                          key={m.id}
                          mod={m}
                          selected={chosen.some((c) => c.id === m.id)}
                          hero={FLAVOUR_HEROES.includes(m.name)}
                          onClick={() => toggle(g, m.id)}
                        />
                      ))}
                    </div>
                    {g.max_select > 1 && chosen.length === 2 && (
                      <p className="mt-3 text-[11.5px] text-[var(--gold)]">
                        Mixing {chosen[0].name} + {chosen[1].name}
                      </p>
                    )}
                  </Group>
                );
              })}
            </div>

            {/* ---- footer ---- */}
            <div
              className="glass border-t border-[var(--border)] px-5 pt-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center gap-3">
                {/* order several of the same thing in one go */}
                <div className="flex flex-none items-center rounded-full border border-[var(--border)] px-0.5">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="One less"
                    className="grid size-9 place-items-center text-[var(--text-dim)] disabled:opacity-30"
                    disabled={qty === 1}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-5 text-center text-[14px] font-semibold">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(30, q + 1))}
                    aria-label="One more"
                    className="grid size-9 place-items-center text-[var(--gold)]"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="display text-[22px] text-[var(--text)]">
                    ₹{(unit * qty).toLocaleString('en-IN')}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--text-dim)]">
                    {[variant?.name, ...allChosen.map((m) => m.name)]
                      .filter(Boolean)
                      .join(' · ') || 'No extras'}
                  </div>
                  {variant?.perk && (
                    <div className="truncate text-[11px] text-[var(--gold)]">
                      {variant.perk} included
                    </div>
                  )}
                </div>

                {/* a dead grey button with no explanation reads as broken */}
                <button
                  disabled={!!missing}
                  onClick={handleAdd}
                  className="btn-gold flex-none px-6 py-3 text-[13px] tracking-wide whitespace-nowrap uppercase disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {missing ? promptFor(missing.name) : 'Add to order'}
                </button>
              </div>
            </div>
      </div>
    </>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
          {title}
        </h3>
        {hint && <span className="text-[11px] text-[var(--text-faint)]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chip({
  mod,
  selected,
  hero,
  onClick,
}: {
  mod: Modifier;
  selected: boolean;
  hero?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition ${
        selected
          ? 'border-[var(--gold)] bg-[var(--surface-2)] text-[var(--text)] shadow-[var(--glow-soft)]'
          : 'border-[var(--border)] text-[var(--text-dim)] active:scale-95'
      }`}
    >
      {selected && <Check size={12} className="text-[var(--gold)]" strokeWidth={3} />}
      {mod.name}
      {mod.price > 0 && <span className="text-[var(--gold)]">+₹{mod.price}</span>}
      {hero && !selected && (
        <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--ember)]" />
      )}
    </button>
  );
}
