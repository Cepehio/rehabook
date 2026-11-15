import { useEffect, useState } from 'react';

/**
 * Grąžina true, kai naršyklės langas atitinka CSS media užklausą, ir seka jos pokyčius.
 * Naudojama ten, kur vien CSS nepakanka (pvz. kalendoriaus numatytam rodiniui).
 * Serverio/jsdom aplinkoje be matchMedia grąžina false.
 */
// Prenumeruoja matchMedia pokycius ir grazina true/false; atsisako prenumeratos isjungiant komponenta.
export default function useMediaQuery(query) {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [matches, setMatches] = useState(() =>
    supported ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (!supported) return undefined;
    const media = window.matchMedia(query);
    const update = (event) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query, supported]);

  return matches;
}

/** Siauras (mobilus) ekranas – ta pati riba kaip globals.css mobiliame sluoksnyje. */
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
