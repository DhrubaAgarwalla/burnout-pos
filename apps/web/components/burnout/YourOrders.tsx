'use client';

import { useEffect } from 'react';
import { BellRing, Check, ChefHat, Clock, Receipt, X } from 'lucide-react';
import { useTableTab } from '@/lib/burnout/live';
import type { TabOrder } from '@/lib/burnout/pos';
import { useMounted } from '@/lib/burnout/client';
import type { OrderStatus } from '@/lib/burnout/types';

/**
 * The table's running tab.
 *
 * Without this a guest places an order and then has no evidence it ever
 * happened — no confirmation to look back at, no total, nothing to show
 * a waiter. Everything ordered from this table stacks up here until the
 * table is closed.
 */

const STATUS: Record<
  OrderStatus | 'ready',
  { label: string; note: string; icon: typeof Clock }
> = {
  new: { label: 'Sent to the kitchen', note: 'We have your order', icon: Clock },
  seen: { label: 'Confirmed', note: 'Our team has it', icon: Check },
  accepted: { label: 'Being prepared', note: 'Cooking fresh for you', icon: ChefHat },
  ready: { label: 'On its way', note: "It's ready — coming to your table", icon: BellRing },
  served: { label: 'Served', note: 'Enjoy!', icon: Check },
  cancelled: { label: 'Cancelled', note: 'Ask our staff if this looks wrong', icon: X },
};

/** where a round is, as the guest would put it */
function stageOf(o: TabOrder): keyof typeof STATUS {
  if (o.status === 'served' || o.status === 'cancelled') return o.status;
  if (o.readyAt) return 'ready';
  if (o.status === 'accepted') return 'accepted';
  // a member of the floor staff taking it counts as confirmed
  if (o.status === 'seen' || o.takenAt) return 'seen';
  return 'new';
}

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function YourOrders({
  tableLabel,
  tableToken,
}: {
  tableLabel: string;
  tableToken: string;
}) {
  const mounted = useMounted();
  const tab = useTableTab((s) => s.orders);
  const tabToken = useTableTab((s) => s.token);
  const load = useTableTab((s) => s.load);

  // The table's tab from the POS. It sends guests no events, so the phone
  // asks every 15 seconds while the page is open, and on coming back to it.
  useEffect(() => {
    const refresh = () => void load(tableToken).catch(() => {});
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(onVisible, 15_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(poll);
    };
  }, [load, tableToken]);

  // server render has no orders, so wait for the device before showing any
  if (!mounted) return null;

  const mine: TabOrder[] = tabToken === tableToken ? [...tab].reverse() : [];

  if (mine.length === 0) return null;

  return (
    <section className="layer px-5 pb-8">
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Receipt size={14} className="text-[var(--gold)]" />
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
            Your table&apos;s order
          </h2>
          <span className="ml-auto text-[11px] text-[var(--text-faint)]">
            {tableLabel}
          </span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {mine.map((o) => {
            const s = STATUS[stageOf(o)];
            const Icon = s.icon;
            return (
              <div key={o.id} className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Icon size={13} className="flex-none text-[var(--gold)]" />
                  <span className="text-[13px] font-medium text-[var(--text)]">
                    {s.label}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--text-faint)]">
                    #{o.no} ·{' '}
                    {new Date(o.placedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="mt-0.5 text-[11.5px] text-[var(--text-faint)]">{s.note}</p>

                <ul className="mt-2 space-y-1">
                  {o.lines.map((l) => (
                    <li key={l.key} className="flex gap-2 text-[12.5px]">
                      <span className="font-semibold text-[var(--gold)]">{l.qty}×</span>
                      <span className="min-w-0 flex-1 text-[var(--text-dim)]">
                        {l.name}
                        {(l.variant || l.modifiers.length > 0) && (
                          <span className="text-[var(--text-faint)]">
                            {' '}
                            — {[l.variant, ...l.modifiers.map((m) => m.name)]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="flex-none text-[var(--text-faint)]">
                        {money(l.unit_price * l.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* deliberately no running total — the bill comes from the POS at
            the counter, and a number here that disagrees with it by a rupee
            turns into an argument at payment time */}
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
          <p className="text-[12px] text-[var(--text-dim)]">
            {mine.length > 1
              ? `${mine.length} rounds on this table.`
              : 'Everything stays on this table.'}{' '}
            Your bill is prepared at the counter when you&apos;re done — order
            more any time.
          </p>
        </div>
      </div>
    </section>
  );
}
