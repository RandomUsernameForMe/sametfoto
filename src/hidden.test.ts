import { expect, test } from 'vitest';
import { isShown, photoKey, withState } from './hidden';

const file = (name: string, size: number, lastModified: number) => ({ name, size, lastModified });

test('photoKey rozliší fotky se stejným názvem z různých karet', () => {
  expect(photoKey(file('IMG_0001.JPG', 100, 1))).not.toBe(photoKey(file('IMG_0001.JPG', 200, 1)));
  expect(photoKey(file('IMG_0001.JPG', 100, 1))).toBe(photoKey(file('IMG_0001.JPG', 100, 1)));
});

test('withState nastaví a zase odebere stav, originál nemění', () => {
  const a = withState({}, ['x', 'y'], 'printed');
  expect(a).toEqual({ x: 'printed', y: 'printed' });
  const b = withState(a, ['x'], undefined);
  expect(b).toEqual({ y: 'printed' });
  expect(a).toEqual({ x: 'printed', y: 'printed' });
});

test('skryté a vytištěné fotky se ukážou jen se „Zobrazit skryté“', () => {
  expect(isShown(undefined, false)).toBe(true);
  expect(isShown('printed', false)).toBe(false);
  expect(isShown('hidden', false)).toBe(false);
  expect(isShown('hidden', true)).toBe(true);
});
