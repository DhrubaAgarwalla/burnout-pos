'use client';

import Image from 'next/image';
import { Check, Plus } from 'lucide-react';
import { useCart } from '@/lib/burnout/store';
import ItemVisual from './ItemVisual';
import { COMBO_CONTENTS } from '@/lib/burnout/menu';
import type { Item } from '@/lib/burnout/types';

export default function ComboCard({ item }: { item: Item }) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const qty = lines
    .filter((l) => l.item_id === item.id)
    .reduce((n, l) => n + l.qty, 0);

  // "1 Hookah · 1 Maggi · 1 Red Bull" — the description is the list, so a
  // combo added or edited in admin shows what's in it
  const contents = item.description
    ? item.description.split('·').map((s) => s.trim()).filter(Boolean)
    : (COMBO_CONTENTS[item.id] ?? []);

  return (
    <article className="card relative w-[248px] overflow-hidden">
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="248px"
            unoptimized={item.image_url.startsWith('/api/')}
            className="object-cover"
          />
        ) : (
          <ItemVisual name={item.name} kind="combo" rounded="" className="absolute inset-0" />
        )}

        {/* scrim so the text sits on something, whatever the photo does */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/70 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="display text-[21px] leading-tight text-white">{item.name}</h3>

          {contents.length > 0 && (
            <ul className="mt-2 space-y-1">
              {contents.map((c) => (
                <li key={c} className="flex items-center gap-1.5 text-[11.5px] text-white/80">
                  <Check size={11} className="text-[var(--gold-soft)]" strokeWidth={3} />
                  {c}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="display text-[22px] text-[var(--gold-soft)]">
              ₹{item.price.toLocaleString('en-IN')}
            </span>
            <button
              onClick={() => add(item)}
              className="btn-gold flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] tracking-wide uppercase"
            >
              {qty > 0 ? `Added · ${qty}` : 'Add'}
              {qty === 0 && <Plus size={13} strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
