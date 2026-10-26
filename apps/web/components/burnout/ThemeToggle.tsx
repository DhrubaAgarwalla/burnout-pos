'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { themeByClock, useTheme } from '@/lib/burnout/store';
import { useClockValue, useMounted } from '@/lib/burnout/client';

export default function ThemeToggle() {
  const manual = useTheme((s) => s.manual);
  const setTheme = useTheme((s) => s.setTheme);
  const mounted = useMounted();

  // follows the clock until the guest overrides it
  const clockTheme = useClockValue(themeByClock, 'night');
  const theme = manual ?? clockTheme;

  useEffect(() => {
    document.querySelector('.burnout')?.setAttribute('data-theme', theme);
  }, [theme]);

  // the server has no idea what the phone's clock says
  if (!mounted) return <div className="size-9" />;

  const next = theme === 'night' ? 'day' : 'night';

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]/70 text-[var(--gold)] backdrop-blur transition active:scale-90"
    >
      {theme === 'night' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
