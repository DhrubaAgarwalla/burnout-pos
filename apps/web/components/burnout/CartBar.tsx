'use client';


import { ArrowRight, ShoppingBag } from 'lucide-react';
import { cartCount, cartSubtotal, useCart, useGuest } from '@/lib/burnout/store';
import { evaluateOffers } from '@/lib/burnout/offers';
import type { Item, Offer } from '@/lib/burnout/types';

export default function CartBar({
  offers,
  items,
  onOpen,
}: {
  offers: Offer[];
  items: Item[];
  onOpen: () => void;
}) {
  const lines = useCart((s) => s.lines);
  const visitCount = useGuest((s) => s.visitCount);

  const subtotal = cartSubtotal(lines);
  const count = cartCount(lines);

  const { nudges } = evaluateOffers(offers, {
    subtotal,
    isFirstTime: visitCount === 0,
    visitCount,
    itemPrice: (id) => items.find((i) => i.id === id)?.price,
    itemName: (id) => items.find((i) => i.id === id)?.name,
  });

  const nudge = nudges[0];

  if (count === 0) return null;

  return (
    <>
        <div
          className="sheet-enter fixed inset-x-0 bottom-0 z-30 px-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="glass mx-auto max-w-lg overflow-hidden rounded-[22px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
            {nudge && (
              <div className="border-b border-[var(--border)] px-4 pt-3 pb-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-medium text-[var(--gold)]">
                    {nudge.label}
                  </p>
                  <span className="text-[11px] text-[var(--text-faint)]">
                    {Math.round(nudge.progress * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${nudge.progress * 100}%`,
                      background:
                        'linear-gradient(90deg, var(--gold-soft), var(--gold), var(--copper))',
                    }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={onOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="relative grid size-10 flex-none place-items-center rounded-full bg-[var(--surface-2)] text-[var(--gold)]">
                <ShoppingBag size={17} />
                <span className="absolute -top-1 -right-1 grid size-[18px] place-items-center rounded-full bg-[var(--ember)] text-[10px] font-bold text-white">
                  {count}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[11px] tracking-[0.14em] text-[var(--text-faint)] uppercase">
                  {count} item{count > 1 ? 's' : ''} added
                </span>
                {/* no running total — the bill is raised at the counter */}
                <span className="display block text-[19px] text-[var(--text)]">
                  Review your order
                </span>
              </span>

              <span className="btn-gold flex items-center gap-1.5 px-5 py-2.5 text-[13px] tracking-wide uppercase">
                View order
                <ArrowRight size={14} strokeWidth={3} />
              </span>
            </button>
          </div>
        </div>
    </>
  );
}
