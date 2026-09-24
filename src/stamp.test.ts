import { expect, test } from 'vitest';
import { stampText } from './stamp';

test('datumovka ukazuje herní datum ve formátu kompaktu', () => {
  expect(stampText('1996-06-14')).toBe("'96 6 14");
  expect(stampText('1989-11-07')).toBe("'89 11 7");
});
