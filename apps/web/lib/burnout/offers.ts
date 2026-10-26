import type { Offer } from './types';

/**
 * Offer engine. Pure functions — same result on the phone, on the admin
 * screen and on the server, so the customer never sees a discount that
 * disappears when the order is saved.
 */

export interface OfferContext {
  subtotal: number;
  /** true when this phone number has never ordered before */
  isFirstTime: boolean;
  visitCount: number;
  now?: Date;
  /** price lookup so we can show what a free item is worth */
  itemPrice?: (itemId: string) => number | undefined;
  itemName?: (itemId: string) => string | undefined;
}

export interface AppliedOffer {
  offer: Offer;
  /** rupees taken off the bill */
  discount: number;
  /** an item the guest may add free, or at reward_price */
  rewardItemId: string | null;
  rewardPrice: number;
  label: string;
}

export interface OfferNudge {
  offer: Offer;
  /** spend this much more to unlock it */
  amountAway: number;
  label: string;
  /** 0..1, for the progress bar */
  progress: number;
}

export interface OfferResult {
  applied: AppliedOffer[];
  nudges: OfferNudge[];
  discount: number;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Is the offer live right now (day-of-week + happy-hour window)? */
export function isWithinWindow(offer: Offer, now: Date): boolean {
  if (offer.days && offer.days.length > 0 && !offer.days.includes(now.getDay())) {
    return false;
  }
  if (!offer.start_time || !offer.end_time) return true;

  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = offer.start_time.split(':').map(Number);
  const [eh, em] = offer.end_time.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  // windows that cross midnight, e.g. 22:00 -> 01:00
  return end >= start ? mins >= start && mins < end : mins >= start || mins < end;
}

function matchesAudience(offer: Offer, ctx: OfferContext): boolean {
  if (offer.audience === 'first_time') return ctx.isFirstTime;
  if (offer.audience === 'repeat') return !ctx.isFirstTime;
  return true;
}

/** What this offer is worth on the current bill, in rupees. */
function valueOf(offer: Offer, ctx: OfferContext): number {
  if (offer.percent_off) return (ctx.subtotal * offer.percent_off) / 100;
  if (offer.flat_off) return offer.flat_off;
  if (offer.reward_item) {
    const price = ctx.itemPrice?.(offer.reward_item) ?? 0;
    const pay = offer.reward_price ?? 0;
    return Math.max(0, price - pay);
  }
  return 0;
}

function labelFor(offer: Offer, ctx: OfferContext): string {
  if (offer.percent_off) return `${offer.percent_off}% off — ${offer.title}`;
  if (offer.flat_off) return `${money(offer.flat_off)} off — ${offer.title}`;
  if (offer.reward_item) {
    const name = ctx.itemName?.(offer.reward_item) ?? 'your reward';
    return (offer.reward_price ?? 0) > 0
      ? `${name} at ${money(offer.reward_price!)}`
      : `FREE ${name}`;
  }
  return offer.title;
}

function qualifies(offer: Offer, ctx: OfferContext): boolean {
  if (offer.kind === 'loyalty') {
    const n = offer.visits_needed ?? 0;
    return n > 0 && ctx.visitCount > 0 && ctx.visitCount % n === 0;
  }
  if (offer.min_amount != null) return ctx.subtotal >= offer.min_amount;
  return true;
}

export function evaluateOffers(offers: Offer[], ctx: OfferContext): OfferResult {
  const now = ctx.now ?? new Date();

  const live = offers.filter(
    (o) => o.is_active && matchesAudience(o, ctx) && isWithinWindow(o, now),
  );

  const won = live.filter((o) => qualifies(o, ctx));

  const toApplied = (offer: Offer): AppliedOffer => ({
    offer,
    discount: offer.percent_off
      ? (ctx.subtotal * offer.percent_off) / 100
      : offer.flat_off ?? 0,
    rewardItemId: offer.reward_item,
    rewardPrice: offer.reward_price ?? 0,
    label: labelFor(offer, ctx),
  });

  // Stackable offers all apply together. A non-stackable one only wins if it
  // beats the whole stackable pile on its own.
  const stackable = won.filter((o) => o.is_stackable);
  const exclusive = won.filter((o) => !o.is_stackable);

  const stackValue = stackable.reduce((sum, o) => sum + valueOf(o, ctx), 0);
  const bestExclusive = exclusive.reduce<Offer | null>(
    (best, o) => (!best || valueOf(o, ctx) > valueOf(best, ctx) ? o : best),
    null,
  );

  const applied =
    bestExclusive && valueOf(bestExclusive, ctx) > stackValue
      ? [toApplied(bestExclusive)]
      : stackable.map(toApplied);

  const discount = Math.min(
    ctx.subtotal,
    applied.reduce((sum, a) => sum + a.discount, 0),
  );

  // Nudges: the nearest offers the guest has NOT unlocked yet.
  const nudges: OfferNudge[] = live
    .filter(
      (o) =>
        o.min_amount != null &&
        ctx.subtotal < o.min_amount &&
        o.kind !== 'loyalty',
    )
    .map((o) => {
      const away = o.min_amount! - ctx.subtotal;
      const reward = o.reward_item
        ? (o.reward_price ?? 0) > 0
          ? `${ctx.itemName?.(o.reward_item) ?? 'a hookah'} for ${money(o.reward_price!)}`
          : `a FREE ${ctx.itemName?.(o.reward_item) ?? 'sheesha'}`
        : o.percent_off
          ? `${o.percent_off}% OFF`
          : o.flat_off
            ? `${money(o.flat_off)} OFF`
            : o.title;
      return {
        offer: o,
        amountAway: away,
        label: `Add ${money(away)} more and get ${reward}`,
        progress: Math.max(0, Math.min(1, ctx.subtotal / o.min_amount!)),
      };
    })
    .sort((a, b) => a.amountAway - b.amountAway);

  return { applied, nudges, discount };
}

/** GST is charged on top of the discounted subtotal. */
export function billTotals(
  subtotal: number,
  discount: number,
  taxRate: number,
  taxInclusive: boolean,
) {
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxInclusive ? 0 : (taxable * taxRate) / 100;
  return {
    subtotal,
    discount,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((taxable + tax) * 100) / 100,
  };
}
