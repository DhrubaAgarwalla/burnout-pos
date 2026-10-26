'use client';

import { create, persist } from './zustand';
import type { CartLine, Item, Variant } from './types';

/* ---------------------------------------------------------------
   Cart — lives on the guest's phone until the order is placed
   --------------------------------------------------------------- */

interface CartState {
  lines: CartLine[];
  note: string;
  /** which table this cart belongs to */
  table: string | null;
  /**
   * Scope the cart to a table. Scanning a different table's QR starts a
   * fresh cart rather than inheriting whatever the last table had in it.
   */
  ensureTable: (table: string) => void;
  add: (item: Item, variant?: Variant | null, mods?: CartLine['modifiers']) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  remove: (key: string) => void;
  /** add an extra to a line already in the cart, keeping its quantity */
  addModifier: (key: string, mod: { id: string; name: string; price: number }) => void;
  setNote: (note: string) => void;
  clear: () => void;
}

const lineKey = (
  itemId: string,
  variantId: string | null,
  mods: CartLine['modifiers'],
) => [itemId, variantId ?? '_', ...mods.map((m) => m.id).sort()].join('|');

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      note: '',
      table: null,

      ensureTable: (table) =>
        set((s) => (s.table === table ? s : { table, lines: [], note: '' })),

      add: (item, variant = null, mods = []) =>
        set((state) => {
          const key = lineKey(item.id, variant?.id ?? null, mods);
          const found = state.lines.find((l) => l.key === key);
          if (found) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, qty: l.qty + 1 } : l,
              ),
            };
          }
          const unit =
            (variant ? variant.price : item.price) +
            mods.reduce((s, m) => s + m.price, 0);
          const line: CartLine = {
            key,
            item_id: item.id,
            name: item.name,
            variant: variant?.name ?? null,
            variant_id: variant?.id ?? null,
            modifiers: mods,
            qty: 1,
            unit_price: unit,
            image_url: item.image_url,
            diet: item.diet,
            note: null,
          };
          return { lines: [...state.lines, line] };
        }),

      inc: (key) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)),
        })),

      dec: (key) =>
        set((s) => ({
          lines: s.lines
            .map((l) => (l.key === key ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        })),

      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),

      addModifier: (key, mod) =>
        set((s) => {
          const line = s.lines.find((l) => l.key === key);
          if (!line || line.modifiers.some((m) => m.id === mod.id)) return s;

          const modifiers = [...line.modifiers, mod];
          const nextKey = lineKey(line.item_id, line.variant_id, modifiers);
          const upgraded: CartLine = {
            ...line,
            key: nextKey,
            modifiers,
            unit_price: line.unit_price + mod.price,
          };

          // an identical line may already exist — merge into it
          const twin = s.lines.find((l) => l.key === nextKey);
          return {
            lines: s.lines
              .filter((l) => l.key !== key && l.key !== nextKey)
              .concat(
                twin ? { ...twin, qty: twin.qty + line.qty } : upgraded,
              ),
          };
        }),
      setNote: (note) => set({ note }),
      clear: () => set({ lines: [], note: '' }),
    }),
    { name: 'burnout-cart' },
  ),
);

export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + (l.is_free ? 0 : l.unit_price * l.qty), 0);

export const cartCount = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.qty, 0);

/* ---------------------------------------------------------------
   Guest — name + phone captured once, then remembered
   --------------------------------------------------------------- */

interface GuestState {
  name: string | null;
  phone: string | null;
  customerId: string | null;
  visitCount: number;
  setGuest: (g: {
    name: string;
    phone: string;
    customerId?: string | null;
    visitCount?: number;
  }) => void;
  forget: () => void;
}

export const useGuest = create<GuestState>()(
  persist(
    (set) => ({
      name: null,
      phone: null,
      customerId: null,
      visitCount: 0,
      setGuest: ({ name, phone, customerId = null, visitCount = 0 }) =>
        set({ name, phone, customerId, visitCount }),
      forget: () => set({ name: null, phone: null, customerId: null, visitCount: 0 }),
    }),
    { name: 'burnout-guest' },
  ),
);

/* ---------------------------------------------------------------
   Theme — clock-driven, manual choice wins
   --------------------------------------------------------------- */

export type Theme = 'day' | 'night';

export function themeByClock(now = new Date()): Theme {
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= 690 && mins < 1080 ? 'day' : 'night'; // 11:30 – 18:00
}

/**
 * Only the guest's manual override is stored. The effective theme is
 * derived from the clock in ThemeToggle, so there is no second copy of
 * the truth to keep in sync.
 */
interface ThemeState {
  manual: Theme | null;
  setTheme: (t: Theme | null) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      manual: null,
      setTheme: (t) => {
        set({ manual: t });
        if (typeof document !== 'undefined') {
          // the guest page's own wrapper carries the theme (the POS owns <html>)
          document.querySelector('.burnout')?.setAttribute('data-theme', t ?? themeByClock());
        }
      },
    }),
    { name: 'burnout-theme-store' },
  ),
);
