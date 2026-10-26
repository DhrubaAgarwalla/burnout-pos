import type { Item, ModifierGroup, Offer, Section, Settings, Variant } from './types';

/**
 * The real Burnout menu.
 *
 * Rows are written as [name, price, extra?] and expanded below, so this
 * file stays close to the printed menu and is easy to correct.
 * Everything here maps 1:1 onto the Supabase rows in supabase/schema.sql.
 */

type Row = [string, number, Partial<Item>?];

interface SectionDef {
  slug: string;
  name: string;
  group: string;
  kind: Section['kind'];
  description?: string;
  rows: Row[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** builds size/portion variants: ['Plain', 25], ['Butter', 29] */
const vars = (itemId: string, list: [string, number][], perk: string | null = null): Variant[] =>
  list.map(([name, price], i) => ({
    id: `${itemId}--${slug(name)}`,
    item_id: itemId,
    name,
    price,
    perk: i === 0 ? perk : null,
    is_available: true,
    sort_order: i + 1,
  }));

/* ================================================================
   SHEESHA — from the printed rate card
   ================================================================ */

export const SHEESHA_FLAVOURS = [
  'Brain Freezer', 'Marlin', 'Orange', 'Kiwi', 'Spring Water',
  'Lady Killer', 'Love 66', 'Gum', 'Supari', 'Commissioner',
  'Dubai Special', 'Vanilla', 'Gulabi Paan', 'Zafran Orange', 'Guava',
  'Lemon', 'White Rose', 'Paan Rasna', 'Royal Paan', 'Blueberry',
];

export const FLAVOUR_HEROES = [
  'Brain Freezer', 'Love 66', 'Royal Paan', 'Blueberry', 'Dubai Special',
];

const SHEESHA_ID = 'item-sheesha';

const SHEESHA_MODIFIERS: ModifierGroup[] = [
  {
    id: 'mg-flavour',
    item_id: SHEESHA_ID,
    section_id: null,
    name: 'Choose your flavour',
    min_select: 1,
    // guests may mix two flavours in one head
    max_select: 2,
    sort_order: 1,
    modifiers: SHEESHA_FLAVOURS.map((f, i) => ({
      id: `mod-fl-${slug(f)}`,
      group_id: 'mg-flavour',
      name: f,
      price: 0,
      is_available: true,
      sort_order: i + 1,
    })),
  },
  {
    id: 'mg-base',
    item_id: SHEESHA_ID,
    section_id: null,
    name: 'Upgrade the base',
    none_label: 'Standard water',
    min_select: 0,
    max_select: 1,
    sort_order: 2,
    modifiers: [
      { id: 'mod-base-ice',     group_id: 'mg-base', name: 'Ice-based',      price: 150, is_available: true, sort_order: 1 },
      { id: 'mod-base-milk',    group_id: 'mg-base', name: 'Milk-based',     price: 250, is_available: true, sort_order: 2 },
      { id: 'mod-base-mojito',  group_id: 'mg-base', name: 'Mojito-based',   price: 250, is_available: true, sort_order: 3 },
      { id: 'mod-base-redbull', group_id: 'mg-base', name: 'Red Bull-based', price: 250, is_available: true, sort_order: 4 },
    ],
  },
];

/* ================================================================
   THE MENU
   ================================================================ */

const DEFS: SectionDef[] = [
  {
    slug: 'combos', name: 'Combos', group: 'Combos', kind: 'combo',
    description: 'Hookah + food + drink. One price.',
    rows: [
      ['Combo at 999', 999, {
        description: '1 Hookah · 1 Maggi · 1 Red Bull',
        image_url: '/burnout/menu/combo-999.jpeg', tags: ['bestseller'], order_count: 320,
      }],
      ['Special Combo', 1450, {
        description: '1 Hookah · 1 Red Sauce Pasta · 1 Red Bull · 1 Cheese Chilli Toast',
        image_url: '/burnout/menu/combo-1450.jpeg', tags: ['must-try'], order_count: 190,
      }],
    ],
  },

  {
    slug: 'sheesha', name: 'Sheesha', group: 'Sheesha', kind: 'hookah',
    description: '20 flavours · premium tobacco · quality coals',
    rows: [
      ['Sheesha', 700, {
        description: 'Premium tobacco, quality coals, 20 flavours to pick from.',
        tags: ['bestseller'], order_count: 500,
      }],
    ],
  },

  /* ---------------- starters ---------------- */
  {
    slug: 'soups', name: 'Soups & Comfort Broths', group: 'Starters', kind: 'food',
    rows: [
      ['Classic Sweet Corn Soup', 199],
      ['Wok-Tossed Manchow Soup', 199, { spice_level: 1 }],
      ['Spicy Hot & Sour Soup', 219, { spice_level: 2 }],
      ['Fresh Lemon Coriander Soup', 219],
      ['Cream of Roasted Tomato Soup', 229],
      ['Velvet Broccoli Soup', 239],
      ['Cream of Comfort Vegetable Broth', 249],
    ],
  },
  {
    slug: 'bar-bites', name: 'Bar Bites & Tapas', group: 'Starters', kind: 'chakhana',
    description: 'Small plates that go with everything',
    rows: [
      ['Tavern Peanut Masala', 99, { spice_level: 1, order_count: 260 }],
      ['Classic Salted Fries', 139, { order_count: 240 }],
      ['Mumbai Street Bombay Bhel', 149],
      ['Fiery Peri Peri Popcorn Masala', 159, { spice_level: 2 }],
      ['Crispy Potato Wedges', 169],
      ['Zesty Wai Wai Bhel', 179],
      ['Street-Style Maggi Bhel', 189],
      ['Tangy Aloo Chat', 199],
      ['Masala Sweet Corn Cup', 219],
      ['Spiced Peri Peri Fries', 219, { spice_level: 2, tags: ['bestseller'], order_count: 280 }],
      ['Golden Cheese Corn Tikki', 239],
      ['Liquid Cheese Nachos', 249, { order_count: 210 }],
      ['Melted Cheese Chilli Toast', 249, { spice_level: 1, order_count: 230 }],
      ['Italian Zucchini Cheese Balls', 269],
      ['Basil Pesto Cheese Balls', 269],
      ['American Salt & Pepper Veggies', 279],
      ['Gooey Mozzarella Cheese Balls', 279],
      ['Crunchy Cheesy Paneer Popcorn', 279],
      ['Oven-Baked Cheese Garlic Bread', 279, { order_count: 200 }],
      ['Tandoori Stuffed Aloo', 299],
      ['The Burnout Loaded Bowl of Fries', 299, {
        description: 'Sharing size', tags: ['bestseller'], order_count: 300,
      }],
      ['Fully Loaded Nachos Grande', 319, { tags: ['must-try'] }],
      ['Roasted Cheesy Bell Pepper', 319],
      ['Garlic Sauteed Paneer', 329],
      ['Garlic Sauteed Veg', 329],
      ['Crispy Mozzarella Cheese Sticks', 349],
      ['Toasted Mexican Quesadilla', 379],
    ],
  },
  {
    slug: 'salads-papad', name: 'Salads & Papad', group: 'Starters', kind: 'chakhana',
    description: 'The plates that go on the table first',
    rows: [
      ['Roasted Papad', 49, { description: '2 pieces', order_count: 180 }],
      ['Onion Salad', 59, { description: 'Sliced onion, lemon, green chilli' }],
      ['Masala Papad', 79, { description: 'Onion, tomato, chaat masala', order_count: 200 }],
      ['Papad Bhuji', 79, { description: 'Crushed papad tossed with onion and masala' }],
      ['Onion Bhuji', 89, { description: 'Onion tossed in spices and lemon', spice_level: 1 }],
      ['Green Salad', 99, { description: 'Cucumber, tomato, onion, carrot' }],
    ],
  },
  {
    slug: 'tandoor', name: 'Tandoor Starters', group: 'Starters', kind: 'food',
    rows: [
      ['Pan-Fried Hara Bhara Kebab', 269],
      ['Charcoal Veg Seekh Kebab', 279],
      ['Smoky Tandoori Aloo', 299],
      ['Tangy Achari Paneer Tikka', 329, { spice_level: 1 }],
      ['Cheese Stuffed Tandoori Mushroom', 329],
      ['Creamy Tandoori Malai Broccoli', 329],
      ['Classic Punjabi Paneer Tikka', 349, { tags: ['bestseller'], order_count: 250 }],
      ['Fusion Tandoori Basil Paneer', 349],
      ['Melt-in-Mouth Malai Paneer Tikka', 369, { tags: ['chef-special'] }],
    ],
  },

  /* ---------------- maggi ---------------- */
  {
    slug: 'maggi', name: 'The Maggi Station', group: 'Maggi', kind: 'food',
    rows: [
      ['Nostalgic Plain Maggi', 119, { order_count: 320 }],
      ['Rich Butter Maggi', 169, { order_count: 280 }],
      ['Comforting Soupy Maggi', 189],
      ['Creamy Cheese Maggi', 199, { tags: ['bestseller'], order_count: 300 }],
      ['Garden Vegetable Maggi', 219],
      ['Burnout Signature Sizzling Maggi', 279, { tags: ['chef-special'], order_count: 180 }],
    ],
  },

  /* ---------------- mains ---------------- */
  {
    slug: 'pizzas', name: '9-Inch Artisanal Pizzas', group: 'Mains', kind: 'food',
    rows: [
      ['9" Classic Margherita', 349, { order_count: 200 }],
      ['9" Mexican Hot Wave', 399, { spice_level: 2 }],
      ['9" Smoked BBQ Paneer', 429, { tags: ['bestseller'] }],
      ['9" Crispy Romana Thin Crust', 439],
      ['9" Pesto Picasso', 469],
      ['9" Farm Fresh Green Garden', 479],
    ],
  },
  {
    slug: 'asian', name: 'Asian Wok & Noodles', group: 'Mains', kind: 'food',
    rows: [
      ['Crispy Chinese Bhel', 189],
      ['Wok-Tossed Hakka Noodles', 229, { order_count: 220 }],
      ['Sticky Honey Chilli Potato', 249, { spice_level: 1, tags: ['bestseller'], order_count: 260 }],
      ['Spicy Chilli Garlic Noodles', 249, { spice_level: 2 }],
      ['Szechuan Pepper Noodles', 259, { spice_level: 2 }],
      ['Roasted Hot Garlic Noodles', 259, { spice_level: 1 }],
      ['Dark Soy Chilli Mushroom', 279, { spice_level: 1 }],
      ['Classic Vegetable Manchurian', 289],
      ['Sweet & Sour American Chopsuey', 299],
      ['Savory Chinese Chopsuey', 319],
      ['Wok-Tossed Chilli Paneer', 329, { spice_level: 2, order_count: 240 }],
    ],
  },
  {
    slug: 'burgers', name: 'Burgers, Sandwiches & Rolls', group: 'Mains', kind: 'food',
    rows: [
      ['The Burnout Classic Veg Burger', 199, { tags: ['bestseller'], order_count: 250 }],
      ['Triple-Layer Veg Club Sandwich', 239],
      ['Melting Corn Cheese Sandwich', 249],
      ['Crispy Cheese Cigar Rolls', 259],
      ['Cheesy Corn Wrap', 259],
      ['Crunchy Paneer Patty Burger', 269],
      ['Street-Style Veg Roll', 269],
      ['Crispy Veg Spring Roll', 269],
      ['Smoky Paneer Tikka Roll', 279],
      ['Spiced Veg Seekh Kebab Roll', 279],
      ['Toasted Paneer Tikka Sandwich', 289],
      ['Spicy Mexican Bean Hot Wrap', 289, { spice_level: 2 }],
      ['The Ultimate Double Tikki Burger', 319, { tags: ['must-try'] }],
    ],
  },
  {
    slug: 'pasta', name: 'Pasta & Bowls', group: 'Mains', kind: 'food',
    rows: [
      ['Light Spaghetti Aglio Olio', 289],
      ['Creamy Pink Mix Sauce Pasta', 329, { order_count: 190 }],
      ['Spicy Marinara Red Sauce Pasta', 329, { spice_level: 1, order_count: 210 }],
      ['Aromatic Green Pesto Pasta', 349],
      ['Rich Alfredo White Sauce Pasta', 359, { tags: ['bestseller'] }],
      ['Classic Baked Mac and Cheese', 369],
      ['Oven-Baked Cheese Pasta', 389],
      ['Mediterranean Greek Kebab Bowl', 379],
      ['Loaded Mexican Bowl', 379],
    ],
  },
  {
    slug: 'curries', name: 'Main Course Curries', group: 'Mains', kind: 'food',
    rows: [
      ['Dhaba Style Yellow Dal Tadka', 249],
      ['Garlic-Tempered Moong Dal Fry', 269],
      ['Slow-Cooked Dal Makhani', 289, { tags: ['bestseller'] }],
      ['Homestyle Mix Vegetable Curry', 299],
      ['Smoked Paneer Butter Masala', 329, { order_count: 230 }],
      ['Rich Shahi Paneer', 339],
      ['Spicy Veg Jalfrezi', 339, { spice_level: 2 }],
      ['Wok-Tossed Kadhai Paneer', 339, { spice_level: 1 }],
      ['Roasted Paneer Tikka Masala', 359],
      ['Rich Paneer Do Pyaza', 359],
      ['Creamy Paneer Lababdar', 359],
      ['Cashew-Rich Malai Kofta', 359],
      ['Spiced Mushroom Do Pyaza', 369],
      ['Burnout Special Khichdi', 349, { tags: ['bestseller'], order_count: 240 }],
    ],
  },
  {
    slug: 'rice', name: 'Rice', group: 'Mains', kind: 'food',
    rows: [
      ['Steamed Plain Basmati Rice', 119, { tags: ['no-suggest'] }],
      ['Ghee Roast Jeera Rice', 139],
      ['Fragrant Veg Pulao', 199],
      ['Wok-Tossed Veg Fried Rice', 219, { order_count: 200 }],
      ['Smoky Burnt Garlic Fried Rice', 229],
      ['Paneer & Green Peas Pulao', 239],
      ['Spicy Schezwan Fried Rice', 249, { spice_level: 2 }],
      ['Spiced Mexican Rice', 299],
      ['Italian Basil Pesto Rice', 329],
    ],
  },
  {
    slug: 'breads', name: 'Breads & Sides', group: 'Mains', kind: 'food',
    rows: [
      ['Tava Roti', 25, { variants: vars('item-tava-roti', [['Plain', 25], ['Butter', 29]]) }],
      ['Clay Oven Tandoori Roti', 49],
      ['Butter Tandoori Roti', 59],
      ['Soft Butter Naan', 69, { order_count: 210 }],
      ['Flaky Lachha Paratha', 79],
      ['Chilli Garlic Naan', 99, { spice_level: 1 }],
      ['Stuffed Masala Kulcha', 119],
      ['Cheese Garlic Naan', 129, { tags: ['bestseller'] }],
      ['Stuffed Paneer Kulcha', 139],
      ['Masala Cheese Kulcha', 149],
      // butter is attached to each bread as an option below, not sold as a line
      // papad now lives in its own Salads & Papad section
    ],
  },
  {
    slug: 'sizzlers', name: 'Signature Sizzlers', group: 'Mains', kind: 'food',
    rows: [
      ['The Burnout Classic Veg Sizzler', 380, { tags: ['chef-special'], order_count: 160 }],
      ['Spicy Indo-Chinese Sizzler', 390, { spice_level: 2 }],
      ['Rustic Italian Sizzler', 400],
      ['Fiery Mexican Fiesta Sizzler', 410, { spice_level: 2 }],
      ['Smoky Paneer Tikka Sizzler', 420, { tags: ['must-try'] }],
    ],
  },

  /* ---------------- drinks ---------------- */
  {
    slug: 'coffee', name: 'Hot & Cold Coffee', group: 'Drinks', kind: 'drinks',
    rows: [
      ['Fresh Espresso', 119],
      ['Classic Americano', 139],
      ['Frothy Cappuccino', 159],
      ['Chilled Ice Mocha', 169],
      ['Thick Cold Coffee', 199, { tags: ['bestseller'], order_count: 300 }],
      ['Rich Hot Chocolate', 219],
      ['Ice Strawberry Latte', 239],
      ['Crushed Oreo Latte', 249],
      ['Chocolate Drizzle Cold Coffee', 259],
      ['Cold Coffee with Vanilla Ice Cream', 279],
      ['Italian Tiramisu Cold Coffee', 289, { tags: ['must-try'] }],
    ],
  },
  {
    slug: 'mocktails', name: 'Mocktails & Coolers', group: 'Drinks', kind: 'drinks',
    rows: [
      ['Fresh Lime Soda', 119, { order_count: 240 }],
      ['Classic Lemonade', 129],
      ['Strawberry Crush', 149],
      ['Honey Lemonade', 159],
      ['Mint & Lime Virgin Mojito', 189, { tags: ['bestseller'], order_count: 320 }],
      ['Electric Blue Lagoon', 189, { order_count: 220 }],
      ['Watermelon Mojito', 219],
      ['Grape Mojito', 229],
      ['Spicy Chilli Guava', 239, { spice_level: 1 }],
      ['Mango Mojito', 239],
      ['Chilled Mango Ice Tea', 239],
      ['Green Apple Mojito', 249],
      ['Refreshing Lemon Ice Tea', 249],
      ['Orange Sunrise', 259],
      ['Watermelon Cooler', 259],
      ['Kiwi Mojito', 269],
      ['Tropical Passion Fruit Mojito', 269],
      ['Peach Ice Tea', 269],
      ['Pineapple Cobbler', 279],
      ['Mixed Fruit Punch', 289],
    ],
  },
  {
    slug: 'shakes', name: 'Shakes & Tea', group: 'Drinks', kind: 'drinks',
    rows: [
      ['Classic Milk Tea', 59],
      ['Strong Black Tea', 69],
      ['Lemon Honey Tea', 89],
      ['Soothing Green Tea', 99],
      ['Traditional Thandai', 189],
      ['Fresh Banana Shake', 229],
      ['Classic Vanilla Shake', 239],
      ['White Mocha Shake', 239],
      ['Rich Brownie Shake', 249],
      ['Mango Shake', 249],
      ['Strawberry Shake', 249],
      ['Tropical Pinacolada', 269],
      ['Thick Chocolate Shake', 279, { order_count: 210 }],
      ['Crunchy KitKat Shake', 279, { tags: ['bestseller'] }],
      ['Brownie Oreo Shake', 289],
      ['Double Chocolate Cookie Shake', 319],
      ['Mineral Water', 20, { tags: ['no-suggest'], order_count: 500 }],
      ['Soft Drink', 59],
      ['Diet Coke', 99],
      ['Red Bull', 199, { order_count: 280 }],
    ],
  },

  /* ---------------- dessert ---------------- */
  {
    slug: 'dessert', name: 'Dessert', group: 'Desserts', kind: 'dessert',
    rows: [
      ['Warm Gulab Jamun', 129, { description: '2 pieces' }],
      ['Double Scoop Vanilla Ice Cream', 149],
      ['Gulab Jamun with Ice Cream', 179],
      ['Fudge Brownie', 229, { order_count: 200 }],
      ['Classic (V) Sundae', 279],
      ['Hot Sizzling Brownie', 279, { tags: ['bestseller'], order_count: 230 }],
      ['Sizzling Brownie with Ice Cream', 319, { tags: ['must-try'] }],
    ],
  },
];

/* ================================================================
   expand
   ================================================================ */

export const SECTIONS: (Section & { group: string })[] = DEFS.map((d, i) => ({
  id: d.slug,
  name: d.name,
  slug: d.slug,
  kind: d.kind,
  group: d.group,
  description: d.description ?? null,
  image_url: null,
  sort_order: i + 1,
  is_active: true,
}));

export const GROUPS: { name: string; slugs: string[] }[] = DEFS.reduce(
  (acc, d) => {
    const g = acc.find((x) => x.name === d.group);
    if (g) g.slugs.push(d.slug);
    else acc.push({ name: d.group, slugs: [d.slug] });
    return acc;
  },
  [] as { name: string; slugs: string[] }[],
);

let order = 0;

export const ITEMS: Item[] = DEFS.flatMap((d) =>
  d.rows.map(([name, price, extra = {}]) => {
    const itemId = `item-${slug(name)}`;
    return {
      id: itemId,
      section_id: d.slug,
      name,
      description: null,
      price,
      strike_price: null,
      image_url: null,
      // Burnout's kitchen menu is fully vegetarian
      diet: 'veg' as const,
      spice_level: null,
      prep_minutes: null,
      tags: [],
      is_available: true,
      is_active: true,
      sort_order: ++order,
      order_count: 0,
      ...extra,
    };
  }),
);

// every bread can take extra butter — an option on the item rather than
// a line of its own, so it lands on the ticket against the right roti
for (const bread of ITEMS.filter((i) => i.section_id === 'breads')) {
  bread.modifier_groups = [
    {
      id: `mg-extras-${bread.id}`,
      item_id: bread.id,
      section_id: null,
      name: 'Extras',
      min_select: 0,
      max_select: 2,
      sort_order: 1,
      none_label: 'No extras',
      modifiers: [
        {
          id: `mod-butter-${bread.id}`,
          group_id: `mg-extras-${bread.id}`,
          name: 'Extra butter',
          price: 10,
          is_available: true,
          sort_order: 1,
        },
        {
          id: `mod-cheese-${bread.id}`,
          group_id: `mg-extras-${bread.id}`,
          name: 'Extra cheese',
          price: 30,
          is_available: true,
          sort_order: 2,
        },
      ],
    },
  ];
}

// the sheesha gets its variants and its flavour/base pickers
const sheesha = ITEMS.find((i) => i.id === SHEESHA_ID);
if (sheesha) {
  sheesha.variants = [
    // free coal change applies to a Normal sheesha bought on its own,
    // never to the hookah inside a combo
    { id: 'var-normal',  item_id: SHEESHA_ID, name: 'Normal',  price: 700, perk: 'Free coal change', is_available: true, sort_order: 1 },
    { id: 'var-premium', item_id: SHEESHA_ID, name: 'Premium', price: 999, perk: null, is_available: true, sort_order: 2 },
  ];
  sheesha.modifier_groups = SHEESHA_MODIFIERS;
}

export const COMBO_CONTENTS: Record<string, string[]> = {
  'item-combo-at-999': ['Sheesha (Normal)', 'Maggi', 'Red Bull'],
  'item-special-combo': ['Sheesha (Normal)', 'Red Sauce Pasta', 'Red Bull', 'Cheese Chilli Toast'],
};

export const OFFERS: Offer[] = [
  {
    id: 'offer-ladies-friday', kind: 'happy_hour',
    title: 'Ladies Friday',
    subtitle: 'Free hookah for ladies, every Friday',
    image_url: '/burnout/brand/ladies-friday.jpeg',
    audience: 'all', min_amount: null,
    reward_item: null, reward_price: 0,
    percent_off: null, flat_off: null, visits_needed: null,
    max_per_customer: null, is_stackable: false, section_id: null,
    days: [5], start_time: null, end_time: null,
    is_active: true, sort_order: 1,
  },
  // The spend offers agreed with the client (docs/BRIEF.md). Switched OFF
  // until the owner confirms them: free sheesha at ₹999 for everyone makes
  // the ₹399 hookah for regulars pointless. Turn on in Admin → Offers.
  {
    id: 'offer-free-sheesha-999', kind: 'threshold',
    title: 'Free Sheesha on ₹999+',
    subtitle: 'Cross ₹999 and your sheesha is on the house',
    image_url: null,
    audience: 'all', min_amount: 999,
    reward_item: SHEESHA_ID, reward_price: 0,
    percent_off: null, flat_off: null, visits_needed: null,
    max_per_customer: null, is_stackable: true, section_id: null,
    days: null, start_time: null, end_time: null,
    is_active: false, sort_order: 2,
  },
  {
    id: 'offer-hookah-399', kind: 'threshold',
    title: 'Hookah at ₹399',
    subtitle: 'For our regulars, on any bill over ₹999',
    image_url: null,
    audience: 'repeat', min_amount: 999,
    reward_item: SHEESHA_ID, reward_price: 399,
    percent_off: null, flat_off: null, visits_needed: null,
    max_per_customer: null, is_stackable: true, section_id: null,
    days: null, start_time: null, end_time: null,
    is_active: false, sort_order: 3,
  },
  {
    id: 'offer-first-visit-10', kind: 'threshold',
    title: '10% OFF your first visit',
    subtitle: 'First-time guests, on bills over ₹1499',
    image_url: null,
    audience: 'first_time', min_amount: 1499,
    reward_item: null, reward_price: null,
    percent_off: 10, flat_off: null, visits_needed: null,
    max_per_customer: null, is_stackable: true, section_id: null,
    days: null, start_time: null, end_time: null,
    is_active: false, sort_order: 4,
  },
];

export const SETTINGS: Settings = {
  id: 1,
  name: 'Burnout',
  tagline: 'Hookah · Lounge · Kitchen',
  logo_url: '/burnout/brand/logo.png',
  address: 'Swarnalaya Building, 1st Floor, AT Road, Bharalumukh · Landmark: VLCC Building',
  phone: '9707822960',
  instagram: null,
  currency: 'INR',
  tax_rate: 5,
  tax_inclusive: false,
  opening_hours: { open: '11:30', close: '23:30' },
  theme_mode: 'auto',
  day_starts_at: '11:30',
  night_starts_at: '18:00',
  accepting_orders: true,
  telegram_chat_id: null,
};
