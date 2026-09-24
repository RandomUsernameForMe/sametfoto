export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
export type Rgb = [number, number, number];

export type StyleParams = {
  exposure: number; // -1..1 (stupně EV)
  contrast: number; // -1..1
  fade: number; // 0..80, zvednutí černé
  warmth: number; // -50..50, + = teplejší
  tint: number; // -50..50, + = zelenější
  saturation: number; // 0..2
  mono: boolean;
  shadowTint: Rgb; // -80..80 na kanál
  highlightTint: Rgb;
  grain: number; // 0..40
  vignette: number; // 0..1
  chromaShift: number; // 0..6 px
};

const neutral: StyleParams = {
  exposure: 0, contrast: 0, fade: 0, warmth: 0, tint: 0, saturation: 1, mono: false,
  shadowTint: [0, 0, 0], highlightTint: [0, 0, 0], grain: 0, vignette: 0, chromaShift: 0,
};

export const NEUTRAL: Readonly<StyleParams> = neutral;

const style = (p: Partial<StyleParams>): StyleParams => ({ ...neutral, ...p });

// Pořadí určuje „Styl 1–6“ v UI; názvy klíčů hráči nevidí
export const DEFAULT_STYLES = {
  kodakGold: style({ exposure: 0.05, contrast: 0.1, fade: 16, warmth: 18, tint: 2, saturation: 1.1, highlightTint: [8, 0, -25], vignette: 0.25, grain: 10 }),
  fujiChrome: style({ contrast: 0.35, fade: 5, warmth: -8, tint: 4, saturation: 1.35, shadowTint: [0, 18, 26], highlightTint: [0, 10, 4], grain: 6 }),
  triX: style({ mono: true, contrast: 0.6, vignette: 0.35, grain: 28 }),
  crossProcess: style({ contrast: 0.45, tint: 6, saturation: 1.25, shadowTint: [0, 30, 80], highlightTint: [35, 25, -50], grain: 10 }),
  bulvar: style({ exposure: 0.45, contrast: 0.3, saturation: 0.9, vignette: 0.65, grain: 16 }),
  lofiCcd: style({ contrast: -0.1, fade: 10, warmth: -12, saturation: 0.85, chromaShift: 2, grain: 22 }),
};

export type StyleId = keyof typeof DEFAULT_STYLES;
export const STYLE_IDS = Object.keys(DEFAULT_STYLES) as StyleId[];
export const styleLabel = (id: StyleId) => `Styl ${STYLE_IDS.indexOf(id) + 1}`;

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Tónová LUT pro kanál: expozice → kontrast (S-křivka) → fade → posun kanálu */
export const toneLut = (p: StyleParams, offset: number): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(256);
  const gain = 2 ** p.exposure;
  const lift = p.fade / 255;
  for (let v = 0; v < 256; v++) {
    let x = Math.min(1, (v / 255) * gain);
    x += p.contrast * (x * x * (3 - 2 * x) - x);
    x = lift + x * (1 - lift);
    lut[v] = Math.round(x * 255 + offset);
  }
  return lut;
};

const luma = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

const mono = ({ data }: Pixels) => {
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = luma(data, i);
};

const tone = ({ data }: Pixels, p: StyleParams) => {
  const r = toneLut(p, p.warmth);
  const g = toneLut(p, p.tint);
  const b = toneLut(p, -p.warmth);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r[data[i]];
    data[i + 1] = g[data[i + 1]];
    data[i + 2] = b[data[i + 2]];
  }
};

const splitTone = ({ data }: Pixels, shadows: Rgb, highlights: Rgb) => {
  for (let i = 0; i < data.length; i += 4) {
    const t = luma(data, i) / 255;
    const ws = (1 - t) ** 2;
    const wh = t ** 2;
    for (let c = 0; c < 3; c++) data[i + c] = data[i + c] + shadows[c] * ws + highlights[c] * wh;
  }
};

const saturation = ({ data }: Pixels, amount: number) => {
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data, i);
    for (let c = 0; c < 3; c++) data[i + c] = l + (data[i + c] - l) * amount;
  }
};

const chromaShift = ({ data, width }: Pixels, px: number) => {
  for (let i = data.length - 4; i >= 0; i -= 4) {
    const x = (i / 4) % width;
    if (x >= px) data[i] = data[i - px * 4];
  }
};

const vignette = ({ data, width, height }: Pixels, amount: number) => {
  const cx = width / 2;
  const cy = height / 2;
  const maxD = cx * cx + cy * cy;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const f = 1 - amount * (((x - cx) ** 2 + (y - cy) ** 2) / maxD) ** 1.5;
      const i = (y * width + x) * 4;
      data[i] *= f;
      data[i + 1] *= f;
      data[i + 2] *= f;
    }
  }
};

const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const grain = ({ data }: Pixels, amount: number, seed: number) => {
  const rnd = mulberry32(seed);
  for (let i = 0; i < data.length; i += 4) {
    const t = luma(data, i) / 255;
    const n = (rnd() + rnd() + rnd() - 1.5) * amount * (0.4 + 2.4 * t * (1 - t));
    data[i] = clamp(data[i] + n);
    data[i + 1] = clamp(data[i + 1] + n);
    data[i + 2] = clamp(data[i + 2] + n);
  }
};

const isZero = (c: Rgb) => c.every((v) => v === 0);

export const applyStyle = (px: Pixels, p: StyleParams, seed = 1) => {
  if (p.mono) mono(px);
  tone(px, p);
  if (!isZero(p.shadowTint) || !isZero(p.highlightTint)) splitTone(px, p.shadowTint, p.highlightTint);
  if (p.saturation !== 1 && !p.mono) saturation(px, p.saturation);
  if (p.chromaShift > 0) chromaShift(px, Math.round(p.chromaShift));
  if (p.vignette > 0) vignette(px, p.vignette);
  if (p.grain > 0) grain(px, p.grain, seed);
};
