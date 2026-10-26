'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Flame, Leaf, MapPin, Search, Sparkles, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ComboCard from './ComboCard';
import ItemRow from './ItemRow';
import ItemSheet from './ItemSheet';
import CartBar from './CartBar';
import CartSheet from './CartSheet';
import YourOrders from './YourOrders';
import KitchenPromise from './KitchenPromise';
import {
  ITEMS as SEED_ITEMS, OFFERS as SEED_OFFERS, SECTIONS as SEED_SECTIONS, SETTINGS,
} from '@/lib/burnout/menu';
import { groupsOf, liveSections, startMenuLive, useMenu } from '@/lib/burnout/live';
import { useCart } from '@/lib/burnout/store';
import { useClockValue, useMounted } from '@/lib/burnout/client';
import type { MenuData } from '@/lib/burnout/pos';
import type { Item, Offer } from '@/lib/burnout/types';

const isOpenNow = (d = new Date()) => {
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= 690 && m <= 1410; // 11:30 – 23:30
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The kicker above an offer card, from the offer's own days. This was
 * hard-coded to Ladies Friday's wording, so every offer created in admin
 * claimed to be "Every Friday" and pulsed on Fridays.
 */
function offerWhen(offer: Offer, today: number): { label: string; live: boolean } {
  const days = offer.days ?? [];
  if (days.length === 0) return { label: 'Every day', live: false };
  if (days.includes(today)) return { label: 'Live today', live: true };
  const names = days.map((d) => DAY_NAMES[d]);
  return {
    label: names.length === 1 ? `Every ${names[0]}` : names.map((n) => n.slice(0, 3)).join(' · '),
    live: false,
  };
}

export default function MenuScreen({
  tableLabel,
  tableToken,
  initialMenu,
  debug = false,
}: {
  tableLabel: string;
  /** what the QR code carries: /t/<token> */
  tableToken: string;
  /** the menu this page was server-rendered with */
  initialMenu?: MenuData;
  debug?: boolean;
}) {
  const [builderItem, setBuilderItem] = useState<Item | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(
    () => groupsOf(liveSections(initialMenu?.sections ?? SEED_SECTIONS))[0]?.name ?? '',
  );
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const hits = useRef(0);

  // re-checked every minute on the device; the server always renders "open"
  // so hydration matches
  const open = useClockValue(isOpenNow, true);

  // a cart belongs to one table — opening a different table's QR starts fresh
  const ensureTable = useCart((s) => s.ensureTable);
  useEffect(() => {
    ensureTable(tableLabel);
  }, [ensureTable, tableLabel]);

  // The live menu staff control. Render what the server rendered until
  // mounted, so the server HTML and the first client render agree; staff
  // changes appear right after hydration, and from then on as they happen.
  const mounted = useMounted();
  const storeSections = useMenu((s) => s.sections);
  const storeItems = useMenu((s) => s.items);
  const storeOffers = useMenu((s) => s.offers);
  const loaded = useMenu((s) => s.loaded);
  useEffect(() => startMenuLive(initialMenu, tableToken), [initialMenu, tableToken]);
  const live = mounted && loaded;
  const ITEMS = live ? storeItems : (initialMenu?.items ?? SEED_ITEMS);
  const OFFERS = live ? storeOffers : (initialMenu?.offers ?? SEED_OFFERS);
  // the categories guests see, in the order the admin set; hidden ones drop out
  const allSections = live ? storeSections : (initialMenu?.sections ?? SEED_SECTIONS);
  const SECTIONS = useMemo(() => liveSections(allSections), [allSections]);
  const GROUPS = useMemo(() => groupsOf(SECTIONS), [SECTIONS]);

  /**
   * Which group is on screen.
   *
   * This used to be an IntersectionObserver with percentage rootMargins.
   * It silently reported nothing on some devices, leaving the nav stuck on
   * the first pill however far you scrolled. Measuring positions on scroll
   * is dumber, but it always agrees with what the guest can actually see.
   */
  useEffect(() => {
    if (query) return;
    const groupOf = (slug: string) =>
      GROUPS.find((g) => g.slugs.includes(slug))?.name ?? GROUPS[0]?.name ?? '';

    const compute = () => {
      hits.current += 1;
      const chrome =
        (document.querySelector('header')?.offsetHeight ?? 56) +
        (document.querySelector('nav')?.offsetHeight ?? 54);
      // the last section whose heading has passed under the sticky bars
      const line = chrome + 24;
      let current = SECTIONS[0]?.slug ?? '';
      let found = 0;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.slug);
        if (!el) continue;
        found += 1;
        if (el.getBoundingClientRect().top - line <= 0) current = s.slug;
        else break;
      }
      setActiveGroup(groupOf(current));

      if (debugRef.current) {
        debugRef.current.textContent =
          `runs ${hits.current} · y ${Math.round(window.scrollY)} · ` +
          `chrome ${chrome} · line ${line} · seen ${found}/${SECTIONS.length} · ` +
          `→ ${current} (${groupOf(current)})`;
      }
    };

    // Run straight off the scroll event. Deliberately NOT throttled through
    // requestAnimationFrame: rAF is suspended while a tab is backgrounded,
    // which would leave the pill stale when the guest switches apps and
    // comes back. Reading ~20 rects is cheap and does no layout thrashing.
    const t = setTimeout(compute, 0);

    // `document` as well as `window`: scroll events originate on the
    // document and some mobile browsers are fussy about which one you
    // listen on. Listening twice is harmless — compute is idempotent.
    window.addEventListener('scroll', compute, { passive: true });
    document.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    // coming back from another app, or from the back/forward cache
    window.addEventListener('pageshow', compute);
    document.addEventListener('visibilitychange', compute);

    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', compute);
      document.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
      window.removeEventListener('pageshow', compute);
      document.removeEventListener('visibilitychange', compute);
    };
  }, [query, SECTIONS, GROUPS]);

  // keep the active pill centred in the rail — scrolling the rail directly
  // rather than scrollIntoView, which can drag the whole page with it
  useEffect(() => {
    const rail = navRef.current;
    const pill = rail?.querySelector<HTMLElement>(`[data-group="${activeGroup}"]`);
    if (!rail || !pill) return;
    rail.scrollTo({
      left: Math.max(0, pill.offsetLeft - rail.clientWidth / 2 + pill.offsetWidth / 2),
      behavior: 'smooth',
    });
  }, [activeGroup]);

  const goto = (slug: string) => {
    const el = document.getElementById(slug);
    if (!el) return;
    // highlight immediately — don't wait for the smooth scroll to land
    setActiveGroup(GROUPS.find((g) => g.slugs.includes(slug))?.name ?? GROUPS[0]?.name ?? '');
    // measure the sticky chrome rather than hard-coding it — the app bar
    // grows by the notch inset in standalone mode
    const chrome =
      (document.querySelector('header')?.offsetHeight ?? 56) +
      (document.querySelector('nav')?.offsetHeight ?? 54);
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - chrome - 8,
      behavior: 'smooth',
    });
  };

  /**
   * Ranked search. A plain "does it contain the text" filter put every
   * burger and sandwich above the actual rolls when you searched "roll",
   * because they all sit in the section "Burgers, Sandwiches & Rolls".
   * Name matches now always outrank section matches.
   */
  const results = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) return [];
    // "rolls" should still find "Veg Roll", and "roll" should find "Rolls"
    const terms = [raw, raw.endsWith('s') ? raw.slice(0, -1) : `${raw}s`];

    const score = (i: Item) => {
      const name = i.name.toLowerCase();
      const desc = i.description?.toLowerCase() ?? '';
      const section =
        SECTIONS.find((s) => s.id === i.section_id)?.name.toLowerCase() ?? '';

      // Take the BEST score across the term variants. Returning on the
      // first hit meant searching "rolls" scored a weak section match
      // before ever trying the singular "roll" against the name.
      const forTerm = (t: string) => {
        if (!t) return 0;
        if (name === t) return 100;
        if (name.startsWith(t)) return 90;
        // a whole word inside the name, e.g. "roll" in "Veg Roll"
        if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return 80;
        if (name.includes(t)) return 70;
        if (desc.includes(t)) return 40;
        if (section.includes(t)) return 20;
        return 0;
      };

      return Math.max(...terms.map(forTerm));
    };

    // nothing from a hidden category turns up in search either
    const shown = new Set(SECTIONS.map((s) => s.id));
    return ITEMS.filter((i) => i.is_active && shown.has(i.section_id))
      .map((i) => ({ item: i, s: score(i) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || b.item.order_count - a.item.order_count)
      .slice(0, 40)
      .map((r) => r.item);
  }, [query, ITEMS, SECTIONS]);

  const sheesha = ITEMS.find((i) => i.section_id === 'sheesha');
  const today = new Date().getDay();
  const kindOf = (sectionId: string) =>
    SECTIONS.find((s) => s.id === sectionId)?.kind ?? 'food';

  return (
    // The menu is phone-first. On a PC, hold it to a phone-ish column
    // instead of stretching item rows across 1500px, which put the price
    // and ADD button a screen-width away from the dish name.
    <div className="mx-auto min-h-dvh max-w-[620px] pb-40">
      {/* ---------------- header ---------------- */}
      <header className="glass appbar sticky top-0 z-30 flex items-center gap-3 px-4">
        <Image
          src="/burnout/brand/logo.png"
          alt="Burnout"
          width={631}
          height={190}
          priority
          className="h-6 w-auto"
        />
        <span className="ml-auto rounded-full border border-[var(--gold)]/35 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--gold)] uppercase">
          {tableLabel}
        </span>
        <ThemeToggle />
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="layer px-5 pt-10 pb-8 text-center">
        <Image
          src="/burnout/brand/logo.png"
          alt="Burnout"
          width={631}
          height={190}
          priority
          className="rise mx-auto h-auto w-[min(72vw,290px)]"
        />

        <p className="rise mt-5 text-[12px] tracking-[0.3em] text-[var(--text-dim)] uppercase">
          {SETTINGS.tagline}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-dim)]">
          <span className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${
                open ? 'bg-[var(--mint)]' : 'bg-[var(--nonveg)]'
              }`}
            />
            {open ? 'Open now' : 'Closed'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> 11:30 AM – 11:30 PM
          </span>
          <span className="flex items-center gap-1.5 text-[var(--veg)]">
            <Leaf size={12} /> Pure veg kitchen
          </span>
        </div>

        <p className="mx-auto mt-3 flex max-w-[300px] items-start justify-center gap-1.5 text-[11.5px] leading-relaxed text-[var(--text-faint)]">
          <MapPin size={12} className="mt-[2px] flex-none" />
          {SETTINGS.address}
        </p>
      </section>

      {/* the table's running tab, above the offers so it's the first thing
          a guest sees after ordering */}
      <YourOrders tableLabel={tableLabel} tableToken={tableToken} />

      {/* ---------------- offers ---------------- */}
      {OFFERS.filter((o) => o.is_active).map((offer) => {
        const when = offerWhen(offer, today);
        return (
          <div key={offer.id} className="layer px-5 pb-8">
            <div
              className={`card relative flex items-center gap-4 overflow-hidden p-3 ${
                when.live ? 'pulse-glow' : ''
              }`}
            >
              {offer.image_url && (
                <div className="relative size-[72px] flex-none overflow-hidden rounded-2xl">
                  <Image
                    src={offer.image_url}
                    alt={offer.title}
                    fill
                    sizes="72px"
                    className="object-cover object-top"
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--gold)]" />
                  <span className="text-[10px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
                    {when.label}
                  </span>
                </div>
                <h3 className="display mt-1 text-[19px] text-[var(--text)]">
                  {offer.title}
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--text-dim)]">
                  {offer.subtitle}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* ---------------- sticky nav / search ---------------- */}
      <nav className="bar subbar sticky z-20 border-y border-[var(--border)] py-2.5">
        {searching ? (
          <div className="flex items-center gap-2 px-4">
            <Search size={16} className="flex-none text-[var(--gold)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              className="w-full bg-transparent py-1 text-[16px] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />
            <button
              onClick={() => {
                setSearching(false);
                setQuery('');
              }}
              aria-label="Close search"
              className="grid size-8 flex-none place-items-center rounded-full border border-[var(--border)] text-[var(--text-dim)]"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div ref={navRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            <button
              onClick={() => {
                setSearching(true);
                setTimeout(() => searchRef.current?.focus(), 30);
              }}
              aria-label="Search the menu"
              className="grid size-[34px] flex-none place-items-center rounded-full border border-[var(--border)] text-[var(--gold)]"
            >
              <Search size={15} />
            </button>
            {GROUPS.map((g) => (
              <button
                key={g.name}
                data-group={g.name}
                onClick={() => goto(g.slugs[0])}
                className={`flex-none rounded-full border px-4 py-1.5 text-[12.5px] whitespace-nowrap transition ${
                  activeGroup === g.name
                    ? 'border-[var(--gold)] bg-[var(--surface-2)] text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text-dim)]'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ---------------- body ---------------- */}
      <main className="layer px-5">
        {query ? (
          <section className="pt-8">
            <h2 className="display text-[24px] text-[var(--text)]">
              {results.length} result{results.length === 1 ? '' : 's'}
            </h2>
            <div className="gold-rule mt-1 mb-2" />
            {results.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">
                Nothing matched “{query}”. Try “paneer”, “mojito” or “maggi”.
              </p>
            ) : (
              results.map((i) => (
                <div key={i.id}>
                  <p className="pt-3 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-faint)] uppercase">
                    {SECTIONS.find((s) => s.id === i.section_id)?.name}
                  </p>
                  <ItemRow item={i} kind={kindOf(i.section_id)} onOpen={setBuilderItem} />
                </div>
              ))
            )}
          </section>
        ) : (
          SECTIONS.map((section) => {
            const items = ITEMS.filter(
              (i) => i.section_id === section.id && i.is_active,
            );
            if (items.length === 0) return null;

            return (
              <section key={section.id} id={section.slug} className="scroll-mt-32 pt-10">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <h2 className="display text-[27px] leading-tight text-[var(--text)]">
                    {section.name}
                  </h2>
                  <span className="flex-none text-[11px] text-[var(--text-faint)]">
                    {items.length} item{items.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="gold-rule mb-1" />
                {section.description && (
                  <p className="mb-4 text-[12.5px] text-[var(--text-dim)]">
                    {section.description}
                  </p>
                )}

                {section.kind === 'combo' ? (
                  <div className="rail pt-3 pb-2">
                    {items.map((i) => (
                      <ComboCard key={i.id} item={i} />
                    ))}
                  </div>
                ) : section.id === 'sheesha' && sheesha ? (
                  <SheeshaBlock item={sheesha} onBuild={() => setBuilderItem(sheesha)} />
                ) : (
                  <div>
                    {items.map((i) => (
                      <ItemRow
                        key={i.id}
                        item={i}
                        kind={section.kind}
                        onOpen={setBuilderItem}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}

        {/* the things worth knowing before ordering, not only after */}
        <div className="pt-14">
          <KitchenPromise compact />
        </div>

        <footer className="layer mt-12 border-t border-[var(--border)] pt-8 pb-4 text-center">
          <Image
            src="/burnout/brand/logo.png"
            alt="Burnout"
            width={631}
            height={190}
            className="mx-auto h-auto w-[130px] opacity-60"
          />
          <p className="mt-4 text-[11.5px] text-[var(--text-faint)]">
            {SETTINGS.phone} · {SETTINGS.address}
          </p>
          <p className="mt-2 text-[11px] text-[var(--text-faint)]">
            All prices exclusive of {SETTINGS.tax_rate}% GST
          </p>
          <p className="mx-auto mt-3 max-w-[300px] text-[8.5px] leading-snug text-[var(--text-faint)] opacity-45">
            All images are for representation purposes only and are not photographs
            of the actual dish served. Product appearance may vary.
          </p>
        </footer>
      </main>

      <ItemSheet
        item={builderItem}
        open={!!builderItem}
        onClose={() => setBuilderItem(null)}
      />

      {debug && (
        <div
          ref={debugRef}
          className="fixed inset-x-0 top-0 z-[99] bg-[var(--ember)] px-2 py-1 text-center font-mono text-[10px] leading-tight text-white"
        >
          nav debug — waiting for first run…
        </div>
      )}

      <CartBar offers={OFFERS} items={ITEMS} onOpen={() => setCartOpen(true)} />

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        tableLabel={tableLabel}
        tableToken={tableToken}
        items={ITEMS}
        sections={SECTIONS}
        offers={OFFERS}
        settings={SETTINGS}
      />
    </div>
  );
}

/* ---------------- sheesha hero block ---------------- */

function SheeshaBlock({ item, onBuild }: { item: Item; onBuild: () => void }) {
  const normal = item.variants?.find((v) => v.name === 'Normal') ?? item.variants?.[0];
  const premium = item.variants?.find((v) => v.name === 'Premium') ?? item.variants?.[1];

  // flavours and base upgrades come from the menu itself, so an edit in
  // Admin → Menu (or a flavour the floor switched off) shows here too
  const groups = item.modifier_groups ?? [];
  const flavourGroup = groups.find((g) => g.min_select > 0) ?? groups[0];
  const flavours = (flavourGroup?.modifiers ?? []).filter((m) => m.is_available).map((m) => m.name);
  const upgrades = groups
    .filter((g) => g !== flavourGroup)
    .flatMap((g) => (g.modifiers ?? []).filter((m) => m.is_available && m.price > 0));
  const byPrice = [...new Set(upgrades.map((m) => m.price))].sort((a, b) => b - a);
  const upgradeLine = byPrice
    .map((p) => `${upgrades.filter((m) => m.price === p).map((m) => m.name).join(' · ')} +₹${p}`)
    .join(' · ');

  return (
    <div className="card relative overflow-hidden">
      {/*
        Uses a crop of just the hookah, not the printed rate card. The full
        poster carried its own "MOJITO-BASED Rs. 250" pricing, which showed
        through behind this block's text — two sets of prices arguing.
      */}
      {/*
        Flex row, not an absolutely positioned overlay. With a percentage
        overlay the text column kept its width while the photo grew, so the
        prices slid under the hookah on a 320px phone. Here the text simply
        takes whatever the photo leaves.
      */}
      <div className="relative flex min-h-[200px] w-full overflow-hidden bg-[#0b0908]">
        <div className="flex min-w-0 flex-1 flex-col justify-center p-5">
          <span className="text-[10px] font-semibold tracking-[0.2em] text-[var(--gold)] uppercase">
            {flavours.length} flavours
          </span>
          <h3 className="display mt-1.5 text-[30px] leading-none text-[#f6efe3]">
            Sheesha
          </h3>

          {/* the perk goes under the tier it belongs to — as a badge on its
              own line it ran past the text column and under the photo */}
          <div className="mt-3.5 flex gap-5">
            <span>
              <span className="block text-[10px] tracking-[0.14em] text-[#a9998a] uppercase">
                {normal?.name ?? 'From'}
              </span>
              <span className="display text-[20px] text-[#f6efe3]">
                ₹{normal?.price ?? item.price}
              </span>
              {normal?.perk && (
                <span className="mt-0.5 flex items-center gap-1 text-[9.5px] leading-tight font-semibold text-[var(--gold-soft)]">
                  <Flame size={9} fill="currentColor" className="flex-none" />
                  {normal.perk}
                </span>
              )}
            </span>
            {premium && (
              <>
                <span className="w-px self-stretch bg-white/10" />
                <span>
                  <span className="block text-[10px] tracking-[0.14em] text-[#a9998a] uppercase">
                    {premium.name}
                  </span>
                  <span className="display text-[20px] text-[var(--gold-soft)]">
                    ₹{premium.price}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="relative w-[112px] flex-none sm:w-[150px]">
          <Image
            src="/burnout/menu/hookah.jpeg"
            alt=""
            aria-hidden
            fill
            sizes="150px"
            className="object-cover object-top"
          />
          {/* fade the photo into the card so it has no hard edge */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0908] via-[#0b0908]/45 to-transparent" />
        </div>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--gold)] uppercase">
          Popular flavours
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {flavours.slice(0, 8).map((f) => (
            <span
              key={f}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-dim)]"
            >
              {f}
            </span>
          ))}
          {flavours.length > 8 && (
            <span className="rounded-full border border-[var(--gold)]/40 px-3 py-1.5 text-[12px] text-[var(--gold)]">
              +{flavours.length - 8} more
            </span>
          )}
        </div>

        <button
          onClick={onBuild}
          className="btn-gold mt-5 w-full py-3.5 text-[14px] tracking-[0.1em] uppercase"
        >
          Build your sheesha
        </button>

        {upgradeLine && (
          <p className="mt-3 text-center text-[11px] text-[var(--text-faint)]">{upgradeLine}</p>
        )}
      </div>
    </div>
  );
}
