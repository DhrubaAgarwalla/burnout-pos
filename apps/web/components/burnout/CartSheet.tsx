'use client';

import { useMemo, useState } from 'react';

import { Check, ChevronLeft, Minus, Plus, Trash2, X } from 'lucide-react';
import ItemVisual from './ItemVisual';
import KitchenPromise from './KitchenPromise';
import { cartSubtotal, useCart, useGuest } from '@/lib/burnout/store';
import { useTableTab } from '@/lib/burnout/live';
import { RemoteError, placeOrder } from '@/lib/burnout/pos';
import { billTotals, evaluateOffers } from '@/lib/burnout/offers';
import { suggestFor } from '@/lib/burnout/suggest';
import { normalisePhone, phoneError } from '@/lib/burnout/phone';
import type { CartLine, Item, Modifier, Offer, Section, Settings } from '@/lib/burnout/types';

type Step = 'cart' | 'details' | 'done';

export default function CartSheet({
  open,
  onClose,
  tableLabel,
  tableToken,
  items,
  sections,
  offers,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  tableLabel: string;
  tableToken: string;
  items: Item[];
  sections: Section[];
  offers: Offer[];
  settings: Settings;
}) {
  const lines = useCart((s) => s.lines);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const remove = useCart((s) => s.remove);
  const note = useCart((s) => s.note);
  const setNote = useCart((s) => s.setNote);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const addModifier = useCart((s) => s.addModifier);

  const guest = useGuest();
  const loadTab = useTableTab((s) => s.load);
  const [step, setStep] = useState<Step>('cart');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);

  const subtotal = cartSubtotal(lines);

  const { applied, discount } = evaluateOffers(offers, {
    subtotal,
    isFirstTime: guest.visitCount === 0,
    visitCount: guest.visitCount,
    itemPrice: (id) => items.find((i) => i.id === id)?.price,
    itemName: (id) => items.find((i) => i.id === id)?.name,
  });

  const bill = billTotals(subtotal, discount, settings.tax_rate, settings.tax_inclusive);
  const suggestions = useMemo(
    () => suggestFor(lines, items, sections),
    [lines, items, sections],
  );

  /**
   * Breads in the cart that haven't had their extras picked yet, so we can
   * ask once at checkout rather than hoping the guest opened the item sheet.
   */
  const breadPrompts = useMemo(() => {
    return lines
      .map((line) => {
        const item = items.find((i) => i.id === line.item_id);
        if (!item || item.section_id !== 'breads') return null;
        const group = item.modifier_groups?.find((g) => g.name === 'Extras');
        const extras = (group?.modifiers ?? []).filter(
          (m) => m.is_available && !line.modifiers.some((lm) => lm.id === m.id),
        );
        return extras.length ? { line, extras } : null;
      })
      .filter((x): x is { line: CartLine; extras: Modifier[] } => x !== null);
  }, [lines, items]);

  const phoneProblem = phoneError(phone);
  const phoneOk = !phoneProblem;
  const nameOk = name.trim().length >= 2;

  const startCheckout = () => {
    if (guest.phone && guest.name) {
      void place(guest.name, guest.phone);
    } else {
      setStep('details');
    }
  };

  async function place(guestName: string, guestPhone: string) {
    setPlacing(true);
    setPlaceError(null);
    try {
      // Only what was chosen goes to the POS — it prices the order itself,
      // so the till never sees a figure from a phone.
      const no = await placeOrder(tableToken, {
        name: guestName,
        phone: normalisePhone(guestPhone),
        note,
        lines,
      });
      void loadTab(tableToken).catch(() => {});

      guest.setGuest({ name: guestName, phone: guestPhone, visitCount: guest.visitCount + 1 });
      setOrderNo(no);
      setStep('done');
      clear();
    } catch (e) {
      setPlaceError(
        e instanceof Error ? e.message : "Couldn't place the order — please try again",
      );
      // a saved name or number the server won't accept: let the guest fix it
      if (e instanceof RemoteError && e.status === 400 && step === 'cart' && guest.phone) {
        setName(guest.name ?? '');
        setPhone(guest.phone);
        setStep('details');
      }
    } finally {
      setPlacing(false);
    }
  }

  const close = () => {
    onClose();
    setPlaceError(null);
    setTimeout(() => setStep('cart'), 250);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fade-enter fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />
      <div
        className="sheet-enter fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] max-w-[620px] flex-col overflow-hidden rounded-t-[26px] border-t border-[var(--border-strong)] bg-[var(--bg-2)] sm:border-x"
        role="dialog"
        aria-label="Your order"
      >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--border-strong)]" />

            {/* ---------- header ---------- */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3">
              {step === 'details' && (
                <button
                  onClick={() => setStep('cart')}
                  aria-label="Back"
                  className="grid size-9 place-items-center rounded-full border border-[var(--border)] text-[var(--text-dim)]"
                >
                  <ChevronLeft size={17} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="display text-[24px] text-[var(--text)]">
                  {step === 'cart' && 'Your order'}
                  {step === 'details' && 'Almost there'}
                  {step === 'done' && 'Order placed'}
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--text-dim)]">
                  {tableLabel}
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="grid size-9 flex-none place-items-center rounded-full border border-[var(--border)] text-[var(--text-dim)]"
              >
                <X size={16} />
              </button>
            </div>

            {/* ---------- body ---------- */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {step === 'cart' && (
                <>
                  <div className="divide-y divide-[var(--border)]">
                    {lines.map((l) => (
                      <div key={l.key} className="flex items-center gap-3 py-3">
                        {l.image_url && (
                          <ItemVisual
                            name={l.name}
                            src={l.image_url}
                            className="size-12 flex-none"
                            rounded="rounded-xl"
                            sizes="48px"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-[var(--text)]">
                            {l.name}
                          </p>
                          {(l.variant || l.modifiers.length > 0) && (
                            <p className="truncate text-[11.5px] text-[var(--text-dim)]">
                              {[l.variant, ...l.modifiers.map((m) => m.name)]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          <p className="mt-0.5 text-[12.5px] text-[var(--gold)]">
                            ₹{(l.unit_price * l.qty).toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="flex flex-none items-center rounded-full border border-[var(--border)] px-0.5">
                          <button
                            onClick={() =>
                              l.qty === 1 ? remove(l.key) : dec(l.key)
                            }
                            aria-label="One less"
                            className="grid size-9 place-items-center text-[var(--text-dim)]"
                          >
                            {l.qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                          </button>
                          <span className="min-w-5 text-center text-[13px] font-semibold">
                            {l.qty}
                          </span>
                          <button
                            onClick={() => inc(l.key)}
                            aria-label="One more"
                            className="grid size-9 place-items-center text-[var(--gold)]"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ---- butter / cheese on the breads ---- */}
                  {breadPrompts.length > 0 && (
                    <section className="card mt-5 p-4">
                      <h3 className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                        Butter on your breads?
                      </h3>
                      <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
                        Goes on the same order — nothing arrives separately.
                      </p>
                      <div className="mt-3 space-y-2.5">
                        {breadPrompts.map(({ line, extras }) => (
                          <div key={line.key} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text)]">
                              {line.qty}× {line.name}
                            </span>
                            {extras.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => addModifier(line.key, m)}
                                className="flex-none rounded-full border border-[var(--gold)]/45 px-3 py-1.5 text-[11.5px] whitespace-nowrap text-[var(--gold)]"
                              >
                                + {m.name.replace('Extra ', '')} ₹{m.price}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ---- suggestions ---- */}
                  {suggestions.length > 0 && (
                    <section className="mt-5">
                      <h3 className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                        Complete your order
                      </h3>
                      <div className="rail mt-3 pb-1">
                        {suggestions.map(({ item, reason }) => (
                          <button
                            key={item.id}
                            onClick={() => add(item)}
                            className="card w-[132px] overflow-hidden p-2 text-left"
                          >
                            {item.image_url && (
                              <ItemVisual
                                name={item.name}
                                src={item.image_url}
                                className="h-[84px] w-full"
                                rounded="rounded-xl"
                                sizes="132px"
                              />
                            )}
                            <p className="mt-2 truncate text-[12.5px] font-medium text-[var(--text)]">
                              {item.name}
                            </p>
                            <p className="truncate text-[10.5px] text-[var(--text-faint)]">
                              {reason}
                            </p>
                            <p className="mt-1 flex items-center justify-between text-[12px] text-[var(--gold)]">
                              ₹{item.price}
                              <Plus size={13} />
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ---- note ---- */}
                  <label className="mt-5 block">
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                      Note for the kitchen
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Less spicy, extra coal, no ice…"
                      className="mt-2 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[16px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--gold)]"
                    />
                  </label>

                  {/*
                    No total shown to the guest. The real bill is raised in
                    the POS at the counter, and a figure here that differs
                    from it by even a rupee becomes an argument at payment
                    time. Item prices stay; the arithmetic does not.
                  */}
                  <div className="card mt-5 p-4">
                    {applied.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {applied.map((a) => (
                          <p
                            key={a.offer.id}
                            className="text-[12.5px] text-[var(--mint)]"
                          >
                            {a.label}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-[12.5px] leading-relaxed text-[var(--text-dim)]">
                      <span className="font-semibold text-[var(--text)]">
                        Your bill is prepared at the counter.
                      </span>{' '}
                      Taxes and any offers are applied there, so the final
                      amount comes from our billing system — not from this
                      screen.
                    </p>
                  </div>
                </>
              )}

              {step === 'details' && (
                <div className="pt-2">
                  <p className="text-[13px] leading-relaxed text-[var(--text-dim)]">
                    First time here? Just your name and number — so we know whose
                    table this is, and so your next visit is quicker.
                  </p>

                  <label className="mt-5 block">
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                      Your name
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="Name"
                      className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[16px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--gold)]"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                      Mobile number
                    </span>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 focus-within:border-[var(--gold)]">
                      <span className="text-[15px] text-[var(--text-dim)]">+91</span>
                      <input
                        value={phone}
                        // keep up to 12 digits so a pasted 91… or leading 0
                        // survives long enough for normalisePhone to strip it;
                        // truncating at 10 first turned 09707822960 into a
                        // number starting with 0 and rejected it
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))
                        }
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="10-digit number"
                        className="w-full bg-transparent py-3.5 text-[16px] tracking-wide text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                      />
                    </div>
                    {phone.length > 0 && phoneProblem && (
                      <span className="mt-1.5 block text-[11.5px] text-[var(--nonveg)]">
                        {phoneProblem}
                      </span>
                    )}
                  </label>

                  <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-faint)]">
                    We only use this to manage your table and order history. No OTP,
                    no spam.
                  </p>

                  {/* last call before the order goes in — one tap, stays on this screen */}
                  {suggestions.length > 0 && (
                    <section className="mt-7 border-t border-[var(--border)] pt-5">
                      <h3 className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                        Anything else before we fire it?
                      </h3>
                      <p className="mt-1 text-[11.5px] text-[var(--text-faint)]">
                        Adding now keeps it on the same round — no second wait.
                      </p>
                      <div className="rail mt-3 pb-1">
                        {suggestions.map(({ item, reason }) => (
                          <button
                            key={item.id}
                            onClick={() => add(item)}
                            className="card w-[132px] overflow-hidden p-2 text-left"
                          >
                            {item.image_url && (
                              <ItemVisual
                                name={item.name}
                                src={item.image_url}
                                className="h-[84px] w-full"
                                rounded="rounded-xl"
                                sizes="132px"
                              />
                            )}
                            <p className="mt-2 truncate text-[12.5px] font-medium text-[var(--text)]">
                              {item.name}
                            </p>
                            <p className="truncate text-[10.5px] text-[var(--text-faint)]">
                              {reason}
                            </p>
                            <p className="mt-1 flex items-center justify-between text-[12px] text-[var(--gold)]">
                              ₹{item.price}
                              <Plus size={13} />
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {step === 'done' && (
                <div className="py-6 text-center">
                  <div
                    className="rise mx-auto grid size-16 place-items-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(140deg, var(--gold-soft), var(--gold) 46%, var(--gold-deep))',
                    }}
                  >
                    <Check size={30} strokeWidth={3} color="#150f08" />
                  </div>

                  <h3 className="display mt-5 text-[26px] text-[var(--text)]">
                    Order #{orderNo} placed
                  </h3>
                  <p className="mx-auto mt-2 max-w-[260px] text-[13px] leading-relaxed text-[var(--text-dim)]">
                    Our team has been notified and is preparing it now. Everything
                    stays on your table&apos;s running tab — order more any time.
                  </p>

                  <div className="mt-6">
                    <KitchenPromise />
                  </div>

                  <button
                    onClick={close}
                    className="btn-gold mt-7 px-7 py-3 text-[13px] tracking-[0.1em] uppercase"
                  >
                    Back to menu
                  </button>
                </div>
              )}
            </div>

            {/* ---------- footer ---------- */}
            {step !== 'done' && (
              <div
                className="glass border-t border-[var(--border)] px-5 pt-4"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                {placeError && (
                  <p role="alert" className="mb-3 text-[12.5px] leading-snug text-[var(--nonveg)]">
                    {placeError}
                  </p>
                )}
                {step === 'cart' ? (
                  <button
                    onClick={startCheckout}
                    disabled={lines.length === 0 || placing}
                    className="btn-gold w-full py-3.5 text-[13px] tracking-[0.1em] uppercase disabled:opacity-40"
                  >
                    {placing ? 'Placing…' : 'Place order'}
                  </button>
                ) : (
                  <button
                    onClick={() => place(name.trim(), phone)}
                    disabled={!nameOk || !phoneOk || placing}
                    className="btn-gold w-full py-3.5 text-[13px] tracking-[0.1em] uppercase disabled:opacity-40"
                  >
                    {placing ? 'Placing…' : 'Confirm & place order'}
                  </button>
                )}
              </div>
            )}
      </div>
    </>
  );
}

