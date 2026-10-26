import { useRef, useSyncExternalStore } from "react";

// The few pieces of zustand the Burnout guest screens use (`create`,
// `persist`), so they run here unchanged without adding a dependency to this
// app. Same calling convention: create<State>()(persist((set, get) => …,
// { name })), and a hook that takes a selector.
//
// The server always renders a store's initial state, and so does the first
// client render while hydrating (useSyncExternalStore's server snapshot) —
// what a phone had saved only shows after that, so the HTML always matches.

type Partial_<T> = Partial<T> | T;
export type SetState<T> = (partial: Partial_<T> | ((state: T) => Partial_<T>)) => void;
export type GetState<T> = () => T;
export type StateCreator<T> = ((set: SetState<T>, get: GetState<T>) => T) & {
  /** persist(): reads the saved copy once the store exists */
  hydrate?: (set: SetState<T>) => void;
};

export interface UseStore<T> {
  /** the whole state, re-rendering on any change */
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (listener: () => void) => () => void;
}

export function create<T>() {
  return (init: StateCreator<T>): UseStore<T> => {
    const listeners = new Set<() => void>();
    let state: T;
    const getState: GetState<T> = () => state;
    const setState: SetState<T> = (partial) => {
      const next =
        typeof partial === "function"
          ? (partial as (state: T) => Partial_<T>)(state)
          : partial;
      if (Object.is(next, state)) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    };
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    };

    state = init(setState, getState);
    const initial = state;
    init.hydrate?.(setState);

    const useStore = (<U>(selector: (state: T) => U = (s) => s as unknown as U): U => {
      // a selector may build a new array each call; hand back the same one
      // until the state itself changes
      const memo = useRef<{ state: T; value: U } | null>(null);
      const select = (s: T) => {
        if (memo.current && Object.is(memo.current.state, s)) return memo.current.value;
        const value = selector(s);
        memo.current = { state: s, value };
        return value;
      };
      return useSyncExternalStore(
        subscribe,
        () => select(state),
        () => selector(initial),
      );
    }) as UseStore<T>;
    useStore.getState = getState;
    useStore.setState = setState;
    useStore.subscribe = subscribe;
    return useStore;
  };
}

/** keeps the store's data (not its functions) in localStorage under `name` */
export function persist<T>(init: StateCreator<T>, options: { name: string }): StateCreator<T> {
  const creator: StateCreator<T> = (set, get) =>
    init((partial) => {
      set(partial);
      try {
        localStorage.setItem(options.name, JSON.stringify({ state: get(), version: 0 }));
      } catch {
        // private mode or storage full: the phone just won't remember
      }
    }, get);
  creator.hydrate = (set) => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(options.name);
      if (saved) set((JSON.parse(saved) as { state: Partial<T> }).state);
    } catch {
      // unreadable copy: start fresh
    }
  };
  return creator;
}
