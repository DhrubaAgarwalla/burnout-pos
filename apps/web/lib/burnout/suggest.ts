import type { CartLine, Item, Section } from './types';

export interface Suggestion {
  item: Item;
  reason: string;
}

/**
 * "Goes great with…" — what we put in front of the guest while they're
 * still deciding. Rules first (a sheesha with no drink is the obvious
 * gap), then most-ordered as a fallback.
 */
export function suggestFor(
  lines: CartLine[],
  items: Item[],
  sections: Section[],
  limit = 4,
): Suggestion[] {
  const kindOf = (itemId: string) => {
    const it = items.find((i) => i.id === itemId);
    return sections.find((s) => s.id === it?.section_id)?.kind;
  };

  const inCart = new Set(lines.map((l) => l.item_id));
  const kinds = new Set(lines.map((l) => kindOf(l.item_id)).filter(Boolean));

  // staples nobody needs nudging about (water, cutlery) are tagged
  // 'no-suggest' in the menu editor and never show up here
  const suggestable = (i: Item) =>
    i.is_available &&
    i.is_active &&
    !inCart.has(i.id) &&
    !i.tags.includes('no-suggest');

  const pool = (kind: string) =>
    items
      .filter(
        (i) => sections.find((s) => s.id === i.section_id)?.kind === kind && suggestable(i),
      )
      .sort((a, b) => b.order_count - a.order_count);

  const out: Suggestion[] = [];
  const push = (list: Item[], reason: string, n = 2) => {
    for (const item of list.slice(0, n)) {
      if (out.length >= limit) return;
      if (out.some((s) => s.item.id === item.id)) continue;
      out.push({ item, reason });
    }
  };

  const hasHookah = kinds.has('hookah') || kinds.has('combo');

  if (hasHookah && !kinds.has('drinks')) {
    push(pool('drinks'), 'Goes great with your sheesha');
  }
  if (hasHookah && !kinds.has('chakhana')) {
    push(pool('chakhana'), 'Something to munch on');
  }
  if (kinds.has('food') && !kinds.has('drinks')) {
    push(pool('drinks'), 'Something to drink?');
  }
  if (!hasHookah && kinds.size > 0) {
    push(pool('hookah'), 'Add a sheesha to the table', 1);
  }

  // fill the rest with what everyone else orders
  if (out.length < limit) {
    const rest = items.filter(suggestable).sort((a, b) => b.order_count - a.order_count);
    push(rest, 'Most ordered', limit - out.length);
  }

  return out.slice(0, limit);
}
