'use client';

import { Ban, ChefHat, Leaf, MessageCircle, Wheat } from 'lucide-react';

/**
 * What Burnout wants every guest to know once they've ordered: what goes
 * into the food, how long it takes, and the two house rules.
 *
 * `compact` drops the reassurance and keeps only what a guest needs
 * BEFORE ordering — used at the foot of the menu.
 */

const PROMISES = [
  {
    icon: ChefHat,
    title: 'Freshly prepared — please allow 15–20 minutes',
    body: "Nothing is pre-cooked and sitting under a lamp. Yours starts the moment you order, so don't worry if it takes a little while.",
    beforeOrdering: true,
  },
  {
    icon: Leaf,
    title: 'No palm oil, no adulterated paneer',
    body: 'We buy honestly and cook honestly. What goes into your food is what should.',
    beforeOrdering: false,
  },
  {
    icon: Wheat,
    title: 'No maida chowmein, no maida pasta',
    body: 'Our noodles and pasta are maida-free — lighter on you, without giving up any taste.',
    beforeOrdering: false,
  },
  {
    icon: MessageCircle,
    title: 'Want it your way?',
    body: 'Ask any of our staff — less spice, no onion, extra anything. Just say the word.',
    beforeOrdering: true,
  },
  {
    icon: Ban,
    title: 'Outside food is not allowed',
    body: 'Thank you for understanding.',
    beforeOrdering: true,
  },
] as const;

export default function KitchenPromise({
  compact = false,
}: {
  compact?: boolean;
}) {
  const rows = compact ? PROMISES.filter((p) => p.beforeOrdering) : PROMISES;

  return (
    <div className="card overflow-hidden text-left">
      {!compact && (
        <div className="border-b border-[var(--border)] px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
            Sit back — while you wait
          </p>
        </div>
      )}

      <div className="divide-y divide-[var(--border)]">
        {rows.map((p) => (
          <div key={p.title} className="flex gap-3 px-4 py-3.5">
            <p.icon
              size={16}
              className="mt-[2px] flex-none text-[var(--gold)]"
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <p className="text-[13px] leading-snug font-semibold text-[var(--text)]">
                {p.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-dim)]">
                {p.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
