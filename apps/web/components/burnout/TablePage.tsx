'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { QrCode, RotateCw } from 'lucide-react';
import MenuScreen from './MenuScreen';
import { fetchMenu, type MenuData } from '@/lib/burnout/pos';

export interface FirstMenu {
  label: string;
  menu: MenuData;
}

/**
 * A table's menu. The server normally hands over the menu it rendered with;
 * if it couldn't reach the POS just then, the phone fetches it itself.
 */
export default function TablePage({ qrToken, first }: { qrToken: string; first: FirstMenu | null }) {
  const [state, setState] = useState<FirstMenu | 'loading' | 'unknown' | 'failed'>(first ?? 'loading');

  useEffect(() => {
    if (state !== 'loading') return;
    fetchMenu(qrToken)
      .then((found) => setState(found ?? 'unknown'))
      .catch(() => setState('failed'));
  }, [qrToken, state]);

  if (state === 'unknown') return <UnknownTable />;
  if (state === 'loading' || state === 'failed') {
    return (
      <Notice
        title={state === 'loading' ? 'Opening the menu…' : "The menu didn't load"}
        body={
          state === 'loading'
            ? 'One moment.'
            : 'Check the WiFi and try again — or ask any of our staff.'
        }
        retry={state === 'failed' ? () => setState('loading') : undefined}
      />
    );
  }
  return <MenuScreen tableLabel={state.label} tableToken={qrToken} initialMenu={state.menu} />;
}

export function UnknownTable() {
  return (
    <Notice
      icon
      title="This QR code isn't active"
      body="It may be from an old table card. Please ask any of our staff — they'll get you the right one."
    />
  );
}

function Notice({
  title,
  body,
  icon = false,
  retry,
}: {
  title: string;
  body: string;
  icon?: boolean;
  retry?: () => void;
}) {
  return (
    <main className="layer grid min-h-dvh place-items-center px-6 text-center">
      <div className="rise max-w-[300px]">
        <Image
          src="/burnout/brand/logo.png"
          alt="Burnout"
          width={631}
          height={190}
          priority
          className="mx-auto h-auto w-[min(60vw,220px)]"
        />
        {icon && <QrCode size={22} className="mx-auto mt-8 text-[var(--gold)]" />}
        <h1 className={`display text-[22px] text-[var(--text)] ${icon ? 'mt-3' : 'mt-8'}`}>{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-dim)]">{body}</p>
        {retry && (
          <button
            onClick={retry}
            className="btn-gold mt-6 inline-flex items-center gap-2 px-6 py-2.5 text-[13px]"
          >
            <RotateCw size={14} /> Try again
          </button>
        )}
      </div>
    </main>
  );
}
