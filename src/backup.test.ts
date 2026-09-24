import { expect, test } from 'vitest';
import { makeBackup, parseBackup } from './backup';
import { DEFAULT_STYLES } from './filters';
import type { Config } from './photographers';

const config = (): Config => ({
  adminPin: '1234',
  gameDates: ['1996-06-14', '1996-06-15', '1996-06-16'],
  activeDate: 1,
  run: 'B',
  photographers: [{ id: 'f1', name: 'Jana', pin: '1111', style: 'triX' }],
  styles: structuredClone(DEFAULT_STYLES),
});

const withConfig = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...makeBackup(config(), {}), config: { ...config(), ...patch } });

test('export a zpětný import vrátí stejná data', () => {
  const hidden = { f1: { 'a.jpg|1|2': 'printed' as const } };
  const text = JSON.stringify(makeBackup(config(), hidden));
  expect(parseBackup(text)).toEqual({ config: config(), hidden });
});

test('odmítne soubor, který není JSON ani záloha Fotolabu', () => {
  expect(() => parseBackup('nesmysl')).toThrow();
  expect(() => parseBackup('{"foo":1}')).toThrow();
});

test('odmítne rozbitou konfiguraci', () => {
  expect(() => parseBackup(withConfig({ adminPin: 42 }))).toThrow();
  expect(() => parseBackup(withConfig({ gameDates: ['14.6.1996'] }))).toThrow();
  expect(() => parseBackup(withConfig({ activeDate: 5 }))).toThrow();
  expect(() => parseBackup(withConfig({ photographers: [{ id: 'x', name: 'A', pin: '1', style: 'neexistuje' }] }))).toThrow();
  expect(() => parseBackup(withConfig({ run: 'C' }))).toThrow();
  expect(() => parseBackup(withConfig({ styles: { ...DEFAULT_STYLES, triX: { ...DEFAULT_STYLES.triX, grain: 'hodně' } } }))).toThrow();
});

test('odmítne neznámý stav fotky', () => {
  const text = JSON.stringify({ ...makeBackup(config(), {}), hidden: { f1: { k: 'smazano' } } });
  expect(() => parseBackup(text)).toThrow();
});

test('starší záloha bez běhu dostane běh A', () => {
  expect(parseBackup(withConfig({ run: undefined })).config.run).toBe('A');
});
