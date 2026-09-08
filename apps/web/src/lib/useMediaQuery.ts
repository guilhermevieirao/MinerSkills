import { useCallback, useSyncExternalStore } from 'react';

/**
 * `true` enquanto a media query casar; re-renderiza quando o viewport cruza o
 * limite. Use o mesmo limite dos mixins do SCSS (`below($bp-lg)` é
 * `(max-width: 1023px)`) para que lógica e CSS troquem juntos.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
