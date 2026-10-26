import { ITEMS as SEED_ITEMS, OFFERS as SEED_OFFERS, SECTIONS as SEED_SECTIONS } from './menu';
import type { CartLine, Item, ModifierGroup, Offer, OrderStatus, Section, Variant } from './types';

/**
 * Burnout's guest menu on this POS: turns the table-QR API
 * (/api/v1/public/menu/<qrToken>) into the shapes the Burnout screens were
 * built around, and back. Used on the server for the first paint and on the
 * phone afterwards, so nothing here touches the DOM.
 *
 * The POS decides dishes, prices, options and what's switched off. How the
 * menu looks — which pill a category sits under, what kind of section it is,
 * badges, the coal-change perk — comes from the printed menu in ./menu.ts,
 * matched by name; a category or dish added in the POS still shows, plainly.
 */

export interface MenuData {
  sections: Section[];
  items: Item[];
  offers: Offer[];
}

export const publicMenuPath = (qrToken: string) =>
  `/api/v1/public/menu/${encodeURIComponent(qrToken)}`;

/** "20261026-0042" -> "42": the part a guest can read out to a waiter */
export function shortNo(orderNumber: string) {
  const m = /^\d{8}-0*(\d+)$/.exec(orderNumber);
  return m ? m[1] : orderNumber;
}

/* ---------------------------------------------------------------
   The menu
   --------------------------------------------------------------- */

type Money = number | string; // decimals arrive as strings

interface PosGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: { id: string; name: string; priceAdjustment: Money }[];
}

interface PosItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: Money;
  isVeg: boolean;
  isVegan: boolean;
  spiceLevel: string;
  modifierGroups: { modifierGroup: PosGroup }[];
}

export interface PosMenu {
  tableName: string;
  categories: { id: string; name: string; items: PosItem[] }[];
}

const key = (s: string) => s.trim().toLowerCase();
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'menu';

const SEED_SECTION = new Map(SEED_SECTIONS.map((s) => [key(s.name), s]));
const SEED_ITEM = new Map(SEED_ITEMS.map((i) => [key(i.name), i]));
const SPICE: Record<string, number> = { MILD: 1, MEDIUM: 2, HOT: 3, EXTRA_HOT: 3 };

// The POS works out the bill, so an offer that would change a price stays
// off here rather than promise what the till won't charge.
const OFFERS: Offer[] = SEED_OFFERS.map((o) =>
  o.percent_off || o.flat_off || o.reward_item ? { ...o, is_active: false } : o,
);

/** photos this app serves: Burnout's own, and ones uploaded in the POS */
function imageFor(url: string | null): string | null {
  if (!url) return null;
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    // already a path on this site
  }
  return path.startsWith('/burnout/') || path.startsWith('/api/uploads/') ? path : null;
}

function itemFrom(p: PosItem, sectionId: string, sortOrder: number): Item {
  const seed = SEED_ITEM.get(key(p.name));
  const base = Number(p.price);
  const groups = p.modifierGroups.map((l) => l.modifierGroup);

  // a required pick-exactly-one group is the dish's versions: Normal / Premium
  const versions = groups.find((g) => g.minSelect === 1 && g.maxSelect === 1);
  const variants: Variant[] = (versions?.modifiers ?? []).map((m, i) => ({
    id: m.id,
    item_id: p.id,
    name: m.name,
    price: base + Number(m.priceAdjustment),
    perk: seed?.variants?.find((v) => key(v.name) === key(m.name))?.perk ?? null,
    is_available: true,
    sort_order: i + 1,
  }));

  const modifierGroups: ModifierGroup[] = groups
    .filter((g) => g !== versions)
    .map((g, i) => ({
      id: g.id,
      item_id: p.id,
      section_id: null,
      name: g.name,
      none_label: seed?.modifier_groups?.find((s) => key(s.name) === key(g.name))?.none_label ?? null,
      min_select: g.minSelect,
      max_select: g.maxSelect,
      sort_order: i + 1,
      modifiers: g.modifiers.map((m, j) => ({
        id: m.id,
        group_id: g.id,
        name: m.name,
        price: Number(m.priceAdjustment),
        is_available: true,
        sort_order: j + 1,
      })),
    }));

  return {
    id: p.id,
    section_id: sectionId,
    name: p.name,
    description: p.description || null,
    price: variants[0]?.price ?? base,
    strike_price: seed?.strike_price ?? null,
    image_url: imageFor(p.imageUrl),
    diet: p.isVegan ? 'vegan' : p.isVeg ? 'veg' : 'nonveg',
    spice_level: SPICE[p.spiceLevel] ?? null,
    prep_minutes: seed?.prep_minutes ?? null,
    tags: seed?.tags ?? [],
    is_available: true,
    is_active: true,
    sort_order: sortOrder,
    order_count: seed?.order_count ?? 0,
    variants: variants.length ? variants : undefined,
    modifier_groups: modifierGroups.length ? modifierGroups : undefined,
  };
}

export function menuFrom(m: PosMenu): MenuData {
  const sections: Section[] = [];
  const items: Item[] = [];
  const used = new Set<string>();
  for (const c of m.categories) {
    if (c.items.length === 0) continue;
    const seed = SEED_SECTION.get(key(c.name));
    let id = seed?.id ?? slugify(c.name);
    if (used.has(id)) id = `${id}-${sections.length + 1}`;
    used.add(id);
    sections.push({
      id,
      name: c.name,
      slug: id,
      kind: seed?.kind ?? 'food',
      group: seed?.group ?? c.name,
      description: seed?.description ?? null,
      image_url: null,
      sort_order: sections.length + 1,
      is_active: true,
    });
    for (const p of c.items) items.push(itemFrom(p, id, items.length + 1));
  }
  return { sections, items, offers: OFFERS };
}

/* ---------------------------------------------------------------
   Talking to the POS from the phone
   --------------------------------------------------------------- */

export class RemoteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const KITCHEN_DOWN =
  "We couldn't reach the kitchen just now — please try again, or ask our staff to take your order";

interface PosErrorBody {
  message?: unknown;
  issues?: { path?: (string | number)[]; message?: string }[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: 'no-store',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
    });
  } catch {
    throw new RemoteError('No connection — check the WiFi and try again', 0);
  }
  const body = (await res.json().catch(() => null)) as (T & PosErrorBody) | null;
  if (!res.ok) throw problem(res.status, body);
  return body as T;
}

/** what the guest is told when the POS says no */
function problem(status: number, body: PosErrorBody | null): RemoteError {
  if (status === 404) return new RemoteError("This table's QR code isn't active — please ask our staff", 404);
  if (status === 429) {
    return new RemoteError('That was a lot of orders in a minute — please wait a moment and try again', 429);
  }
  if (status >= 500) return new RemoteError(KITCHEN_DOWN, status);

  // the name or number: a 400 sends the guest back to fix them
  const detail = body?.issues?.find((i) => i.path?.[0] === 'guestName' || i.path?.[0] === 'guestPhone');
  if (detail?.message) return new RemoteError(detail.message, 400);

  // anything else is about the dishes (409 keeps the guest on the cart)
  const message = typeof body?.message === 'string' ? body.message : '';
  if (/menu items are invalid/i.test(message)) {
    return new RemoteError('A dish in your cart has just come off the menu — please remove it and try again', 409);
  }
  if (/modifiers are invalid|option is not available/i.test(message)) {
    return new RemoteError('An option in your cart has just changed — please remove that dish and add it again', 409);
  }
  if (!message || /validation failed/i.test(message)) {
    return new RemoteError("Something in your cart couldn't be ordered — please check it and try again", 409);
  }
  return new RemoteError(message, 409);
}

/** the table's name and menu, or null if the POS doesn't know this QR code */
export async function fetchMenu(qrToken: string): Promise<{ label: string; menu: MenuData } | null> {
  try {
    const m = await call<PosMenu>(publicMenuPath(qrToken));
    return { label: m.tableName, menu: menuFrom(m) };
  } catch (e) {
    if (e instanceof RemoteError && e.status === 404) return null;
    throw e;
  }
}

/** sends the cart; the POS prices it. Returns the order number to show. */
export async function placeOrder(
  qrToken: string,
  order: { name: string; phone: string; note: string; lines: CartLine[] },
): Promise<string> {
  const note = order.note.trim().slice(0, 300);
  const items = order.lines.map((l, i) => ({
    menuItemId: l.item_id,
    quantity: l.qty,
    modifierIds: [...(l.variant_id ? [l.variant_id] : []), ...l.modifiers.map((m) => m.id)],
    // the POS keeps notes per dish; the guest's note rides on the first one
    ...(i === 0 && note ? { kitchenNote: note } : {}),
  }));
  const placed = await call<{ orderNumber?: string }>(`${publicMenuPath(qrToken)}/order`, {
    method: 'POST',
    body: JSON.stringify({ guestName: order.name, guestPhone: order.phone, items }),
  });
  return shortNo(placed.orderNumber ?? '');
}

/* ---------------------------------------------------------------
   The table's running tab
   --------------------------------------------------------------- */

/** one group of the table's dishes, as YourOrders shows it */
export interface TabOrder {
  id: string;
  no: string;
  status: OrderStatus;
  placedAt: string;
  lines: CartLine[];
  takenAt: string | null;
  readyAt: string | null;
}

type ItemStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

interface PosStatus {
  order: {
    orderNumber: string;
    acceptance: 'NOT_REQUIRED' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt?: string;
    items: {
      id: string;
      nameSnapshot: string;
      quantity: number;
      status: ItemStatus;
      unitPriceSnapshot: Money;
      modifiers: { nameSnapshot: string; priceAdjSnapshot: Money }[];
    }[];
  } | null;
}

type Stage = 'new' | 'seen' | 'accepted' | 'ready' | 'served' | 'cancelled';

/** oldest news first; YourOrders turns the list round so the latest is on top */
const STAGES: Stage[] = ['cancelled', 'served', 'ready', 'accepted', 'seen', 'new'];
const STATUS_OF: Record<Stage, OrderStatus> = {
  new: 'new',
  seen: 'seen',
  accepted: 'accepted',
  ready: 'accepted',
  served: 'served',
  cancelled: 'cancelled',
};

/**
 * The POS keeps a table's whole visit as one order with a status on each
 * dish. A guest sees it as groups: what's still with the kitchen, what's on
 * its way, what's been served.
 */
export async function fetchTab(qrToken: string): Promise<TabOrder[]> {
  const { order } = await call<PosStatus>(`${publicMenuPath(qrToken)}/status`);
  if (!order) return [];
  const placedAt = order.createdAt ?? new Date().toISOString();

  const stageOf = (s: ItemStatus): Stage => {
    if (s === 'CANCELLED' || order.acceptance === 'REJECTED') return 'cancelled';
    if (s === 'SERVED') return 'served';
    if (s === 'READY') return 'ready';
    if (s === 'ACCEPTED' || s === 'PREPARING') return 'accepted';
    return order.acceptance === 'PENDING' ? 'new' : 'seen';
  };

  const byStage = new Map<Stage, CartLine[]>();
  for (const it of order.items) {
    const modifiers = it.modifiers.map((m, i) => ({
      id: `${it.id}-${i}`,
      name: m.nameSnapshot,
      price: Number(m.priceAdjSnapshot),
    }));
    const line: CartLine = {
      key: it.id,
      item_id: '',
      name: it.nameSnapshot,
      variant: null,
      variant_id: null,
      modifiers,
      qty: it.quantity,
      unit_price: Number(it.unitPriceSnapshot) + modifiers.reduce((n, m) => n + m.price, 0),
      image_url: null,
      diet: null,
      note: null,
    };
    const stage = stageOf(it.status);
    byStage.set(stage, [...(byStage.get(stage) ?? []), line]);
  }

  return STAGES.filter((s) => byStage.has(s)).map((s) => ({
    id: `${order.orderNumber}-${s}`,
    no: shortNo(order.orderNumber),
    status: STATUS_OF[s],
    placedAt,
    lines: byStage.get(s)!,
    takenAt: s === 'new' ? null : placedAt,
    readyAt: s === 'ready' ? placedAt : null,
  }));
}
