import { NEUTRAL, STYLE_IDS, type StyleId, type StyleParams } from './filters';
import type { HiddenMap } from './hidden';
import type { Config } from './photographers';

/** Záloha nastavení pro přenos na jiný notebook (archiv složky se přenést nedá) */
export type Backup = { config: Config; hidden: Record<string, HiddenMap> };

const APP = 'sametfoto';
const VERSION = 1;

export const makeBackup = (config: Config, hidden: Record<string, HiddenMap>) => ({ app: APP, version: VERSION, config, hidden });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isIsoDate = (v: unknown) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

const check = (ok: boolean, what: string) => {
  if (!ok) throw new Error(`Soubor není platná záloha Fotolabu (${what}).`);
};

/** Styl musí mít stejné klíče a typy jako výchozí styl, jinak by rozbil vykreslení */
const isStyle = (v: unknown): v is StyleParams =>
  isObj(v) &&
  Object.entries(NEUTRAL).every(([k, def]) =>
    Array.isArray(def)
      ? Array.isArray(v[k]) && (v[k] as unknown[]).length === def.length && (v[k] as unknown[]).every(Number.isFinite)
      : typeof def === 'number'
        ? Number.isFinite(v[k])
        : typeof v[k] === typeof def,
  );

const isPhotographer = (v: unknown) =>
  isObj(v) && ['id', 'name', 'pin'].every((k) => isStr(v[k])) && STYLE_IDS.includes(v.style as StyleId);

const checkConfig = (c: unknown): Config => {
  check(isObj(c), 'chybí nastavení');
  const cfg = c as Record<string, unknown>;
  check(isStr(cfg.adminPin) && cfg.adminPin !== '', 'admin PIN');
  check(Array.isArray(cfg.gameDates) && cfg.gameDates.length > 0 && cfg.gameDates.every(isIsoDate), 'herní data');
  const dates = cfg.gameDates as string[];
  check(Number.isInteger(cfg.activeDate) && (cfg.activeDate as number) >= 0 && (cfg.activeDate as number) < dates.length, 'aktuální den');
  check(cfg.run === undefined || cfg.run === 'A' || cfg.run === 'B', 'běh');
  check(Array.isArray(cfg.photographers) && cfg.photographers.every(isPhotographer), 'fotografové');
  check(isObj(cfg.styles) && Object.entries(cfg.styles).every(([id, s]) => STYLE_IDS.includes(id as StyleId) && isStyle(s)), 'styly');
  return { run: 'A', ...cfg } as Config;
};

const checkHidden = (h: unknown): Record<string, HiddenMap> => {
  check(
    isObj(h) && Object.values(h).every((m) => isObj(m) && Object.values(m).every((s) => s === 'printed' || s === 'hidden')),
    'stav fotek',
  );
  return h as Record<string, HiddenMap>;
};

export const parseBackup = (text: string): Backup => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    check(false, 'není to JSON');
  }
  check(isObj(data) && data.app === APP && data.version === VERSION, 'neznámý formát');
  const d = data as Record<string, unknown>;
  return { config: checkConfig(d.config), hidden: checkHidden(d.hidden ?? {}) };
};
