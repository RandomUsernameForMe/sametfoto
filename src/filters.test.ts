import { expect, test } from 'vitest';
import { DEFAULT_STYLES, NEUTRAL, STYLE_IDS, applyStyle, styleLabel, toneLut } from './filters';

const gradient = () => {
  const width = 16;
  const height = 8;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (i / 4) % 256;
    data[i + 1] = (i / 2) % 256;
    data[i + 2] = 255 - ((i / 4) % 256);
    data[i + 3] = 255;
  }
  return { data, width, height };
};

test('neutrální parametry nemění obraz', () => {
  const px = gradient();
  applyStyle(px, NEUTRAL);
  expect(px.data).toEqual(gradient().data);
});

test('toneLut: fade zvedne černou, offset posune kanál', () => {
  expect(toneLut({ ...NEUTRAL, fade: 20 }, 0)[0]).toBe(20);
  expect(toneLut(NEUTRAL, 10)[100]).toBe(110);
});

test.each(STYLE_IDS)('%s mění pixely a je deterministický', (id) => {
  const a = gradient();
  const b = gradient();
  applyStyle(a, DEFAULT_STYLES[id], 42);
  applyStyle(b, DEFAULT_STYLES[id], 42);
  expect(a.data).toEqual(b.data);
  expect(a.data).not.toEqual(gradient().data);
});

test('mono styl je černobílý', () => {
  const px = gradient();
  applyStyle(px, DEFAULT_STYLES.triX);
  for (let i = 0; i < px.data.length; i += 4) {
    expect(px.data[i]).toBe(px.data[i + 1]);
    expect(px.data[i]).toBe(px.data[i + 2]);
  }
});

test('UI popisek neprozrazuje název stylu', () => {
  expect(STYLE_IDS.map(styleLabel)).toEqual(['Styl 1', 'Styl 2', 'Styl 3', 'Styl 4', 'Styl 5', 'Styl 6']);
});
