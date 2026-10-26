'use client';

import { useSyncExternalStore } from 'react';

/**
 * Small helpers for values that only exist on the phone — the clock, and
 * whether we've hydrated. Using useSyncExternalStore rather than
 * setState-in-an-effect keeps React from doing a second cascading render
 * on every mount (and keeps the react-hooks lint rules happy).
 */

const noSubscribe = () => () => {};
const everyMinute = (onChange: () => void) => {
  const t = setInterval(onChange, 60_000);
  return () => clearInterval(t);
};

/** false while server-rendering, true once mounted in the browser */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Re-evaluates `compute` on the client once a minute.
 * `serverValue` is what the server renders, so hydration always matches.
 * Only use this for primitives — the snapshot is compared with Object.is.
 */
export function useClockValue<T extends string | number | boolean>(
  compute: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(everyMinute, compute, () => serverValue);
}
