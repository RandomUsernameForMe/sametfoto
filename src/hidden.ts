/** Co fotograf s fotkou udělal: vytiskl ji, nebo ji ručně skryl */
export type PhotoState = 'printed' | 'hidden';
export type HiddenMap = Record<string, PhotoState>;

const KEY = 'sametfoto-hidden';

/** Stejná fotka na kartě = stejný název, velikost i čas pořízení */
export const photoKey = (f: { name: string; size: number; lastModified: number }) =>
  `${f.name}|${f.size}|${f.lastModified}`;

export const withState = (map: HiddenMap, keys: string[], state: PhotoState | undefined): HiddenMap => {
  const next = { ...map };
  for (const k of keys) {
    if (state) next[k] = state;
    else delete next[k];
  }
  return next;
};

export const isShown = (state: PhotoState | undefined, showHidden: boolean) => !state || showHidden;

export const loadAll = (): Record<string, HiddenMap> => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
};

export const loadHidden = (photographerId: string): HiddenMap => loadAll()[photographerId] ?? {};

export const saveAll = (all: Record<string, HiddenMap>) => localStorage.setItem(KEY, JSON.stringify(all));

export const saveHidden = (photographerId: string, map: HiddenMap) => saveAll({ ...loadAll(), [photographerId]: map });
