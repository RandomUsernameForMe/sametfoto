import { DEFAULT_STYLES, type StyleId, type StyleParams } from './filters';

export type Photographer = { id: string; name: string; pin: string; style: StyleId };

export type Run = 'A' | 'B';

export type Config = {
  adminPin: string;
  /** Herní dny hry (YYYY-MM-DD) a index toho, který se právě hraje */
  gameDates: string[];
  activeDate: number;
  /** Běh hry, písmeno se tiskne do rohu fotky */
  run: Run;
  photographers: Photographer[];
  styles: Record<StyleId, StyleParams>;
};

const DEFAULTS: Config = {
  adminPin: '0000',
  gameDates: ['1996-06-14', '1996-06-15', '1996-06-16'],
  activeDate: 0,
  run: 'A',
  photographers: (Object.keys(DEFAULT_STYLES) as StyleId[]).map((style, i) => ({
    id: `f${i + 1}`,
    name: `Fotograf ${i + 1}`,
    pin: String(i + 1).repeat(4),
    style,
  })),
  styles: DEFAULT_STYLES,
};

const KEY = 'sametfoto-config';

export const defaultStyle = (id: StyleId): StyleParams => structuredClone(DEFAULT_STYLES[id]);

export const loadConfig = (): Config => {
  const base = structuredClone(DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Config>;
    return { ...base, ...saved, styles: { ...base.styles, ...saved.styles } };
  } catch {
    return base;
  }
};

export const activeGameDate = (c: Config) => c.gameDates[c.activeDate] ?? c.gameDates[0];

export const saveConfig = (c: Config) => localStorage.setItem(KEY, JSON.stringify(c));
