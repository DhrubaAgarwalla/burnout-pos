'use client';

import { ITEMS as SEED_ITEMS, OFFERS as SEED_OFFERS, SECTIONS as SEED_SECTIONS } from './menu';
import { fetchMenu, fetchTab, type MenuData, type TabOrder } from './pos';
import { create } from './zustand';
import type { Section } from './types';

/* ---------------------------------------------------------------
   The menu on a guest's phone
   --------------------------------------------------------------- */

interface MenuState extends MenuData {
  loaded: boolean;
}

export const useMenu = create<MenuState>()(() => ({
  sections: SEED_SECTIONS,
  items: SEED_ITEMS,
  offers: SEED_OFFERS,
  loaded: false,
}));

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/** categories a guest may see, in the order staff arranged */
export const liveSections = (sections: Section[]) =>
  sections.filter((s) => s.is_active).sort(bySort);

/** the pills in the menu's top bar, each jumping to its first category */
export function groupsOf(sections: Section[]): { name: string; slugs: string[] }[] {
  const out: { name: string; slugs: string[] }[] = [];
  for (const s of sections) {
    const g = out.find((x) => x.name === s.group);
    if (g) g.slugs.push(s.id);
    else out.push({ name: s.group, slugs: [s.id] });
  }
  return out;
}

let live = false;
let lastLoad = 0;

/**
 * The POS sends guests no change events, so the menu is re-read every couple
 * of minutes while the page is open — a dish switched off in the POS drops
 * out — and when the phone comes back to the page. The page passes the menu
 * it was rendered with, so nothing is fetched twice on arrival.
 */
export function startMenuLive(initial: MenuData | undefined, qrToken: string) {
  if (live) return;
  live = true;

  const reload = () => {
    if (Date.now() - lastLoad < 30_000) return;
    lastLoad = Date.now();
    void fetchMenu(qrToken)
      .then((found) => found && useMenu.setState({ ...found.menu, loaded: true }))
      .catch(() => {});
  };

  if (initial) {
    lastLoad = Date.now();
    useMenu.setState({ ...initial, loaded: true });
  } else {
    reload();
  }
  setInterval(() => {
    if (document.visibilityState === 'visible') reload();
  }, 120_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reload();
  });
}

/* ---------------------------------------------------------------
   The table's running tab
   --------------------------------------------------------------- */

interface TableTabState {
  /** which table these orders belong to */
  token: string | null;
  orders: TabOrder[];
  load: (qrToken: string) => Promise<void>;
}

export const useTableTab = create<TableTabState>()((set) => ({
  token: null,
  orders: [],
  load: async (qrToken) => {
    const orders = await fetchTab(qrToken);
    set({ token: qrToken, orders });
  },
}));
