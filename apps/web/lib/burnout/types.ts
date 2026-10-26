// Shared types — mirror supabase/schema.sql

export type Diet = 'veg' | 'nonveg' | 'egg' | 'vegan';
export type SectionKind =
  | 'food' | 'combo' | 'hookah' | 'chakhana' | 'drinks' | 'dessert';
export type OrderStatus =
  | 'new' | 'seen' | 'accepted' | 'served' | 'cancelled';
export type OfferKind =
  | 'threshold' | 'happy_hour' | 'combo' | 'loyalty' | 'flat';
export type Audience = 'all' | 'first_time' | 'repeat';
export type StaffRole = 'admin' | 'chef' | 'waiter';
export type TableKind = 'table' | 'takeaway' | 'counter';

export interface Settings {
  id: 1;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  currency: string;
  tax_rate: number;
  tax_inclusive: boolean;
  opening_hours: Record<string, unknown>;
  theme_mode: 'auto' | 'day' | 'night';
  day_starts_at: string;
  night_starts_at: string;
  accepting_orders: boolean;
  telegram_chat_id: string | null;
}

export interface Zone {
  id: string;
  name: string;
  sort_order: number;
}

export interface RestaurantTable {
  id: string;
  zone_id: string | null;
  label: string;
  kind: TableKind;
  qr_token: string;
  seats: number | null;
  is_active: boolean;
  sort_order: number;
  current_session_id: string | null;
}

export interface Section {
  id: string;
  name: string;
  slug: string;
  kind: SectionKind;
  /** the pill it sits under in the menu's top bar: "Starters", "Mains"… */
  group: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Variant {
  id: string;
  item_id: string;
  name: string;
  price: number;
  /** included extra for this tier, e.g. "Free coal change" */
  perk: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  item_id: string | null;
  section_id: string | null;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  /** label for the "pick nothing" chip on an optional group */
  none_label?: string | null;
  modifiers?: Modifier[];
}

export interface Item {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number;
  strike_price: number | null;
  image_url: string | null;
  diet: Diet | null;
  spice_level: number | null;
  prep_minutes: number | null;
  tags: string[];
  is_available: boolean;
  is_active: boolean;
  sort_order: number;
  order_count: number;
  variants?: Variant[];
  modifier_groups?: ModifierGroup[];
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  birthday: string | null;
  visit_count: number;
  total_spend: number;
  notes: string | null;
  first_seen: string;
  last_seen: string;
}

export interface Offer {
  id: string;
  kind: OfferKind;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  audience: Audience;
  min_amount: number | null;
  reward_item: string | null;
  reward_price: number | null;
  percent_off: number | null;
  flat_off: number | null;
  visits_needed: number | null;
  max_per_customer: number | null;
  is_stackable: boolean;
  section_id: string | null;
  days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  sort_order: number;
}

/** One line in the customer's cart (client-side only until the order is placed). */
export interface CartLine {
  key: string;            // item id + variant + modifier signature
  item_id: string;
  name: string;
  variant: string | null;
  variant_id: string | null;
  modifiers: { id: string; name: string; price: number }[];
  qty: number;
  unit_price: number;     // variant price + modifier prices
  image_url: string | null;
  diet: Diet | null;
  note: string | null;
  is_free?: boolean;      // added by an offer, not charged
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  item_id: string | null;
  name: string;
  variant: string | null;
  modifiers: { id: string; name: string; price: number }[];
  qty: number;
  unit_price: number;
  line_total: number;
  is_free: boolean;
  note: string | null;
}

export interface Order {
  id: string;
  session_id: string;
  table_id: string;
  customer_id: string | null;
  round_no: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string | null;
  offer_note: string | null;
  pos_ref: string | null;
  placed_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  items?: OrderItemRow[];
  table?: RestaurantTable;
  customer?: Customer;
}

export interface Session {
  id: string;
  customer_id: string | null;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  total: number;
  tables?: RestaurantTable[];
  orders?: Order[];
}
