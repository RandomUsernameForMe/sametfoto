// Segmenty a–g klasického 7segmentu, bitmaska pro číslice 0–9
const DIGITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];

// [x, y, horizontal] v jednotkách šířky číslice
const SEGMENTS: [number, number, boolean][] = [
  [0, 0, true], [1, 0, false], [1, 1, false], [0, 2, true], [0, 1, false], [0, 0, false], [0, 1, true],
];

/** `YYYY-MM-DD` → `'96 6 14` (bez převodu přes Date, aby nehrálo roli časové pásmo) */
export const stampText = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  return `'${y.slice(-2)} ${Number(m)} ${Number(d)}`;
};

const drawDigit = (ctx: CanvasRenderingContext2D, d: number, x: number, y: number, w: number) => {
  const t = w * 0.18;
  SEGMENTS.forEach(([sx, sy, horiz], i) => {
    if (!(DIGITS[d] & (1 << i))) return;
    const px = x + sx * w - sy * w * 0.12; // mírný sklon
    const py = y + sy * w;
    if (horiz) ctx.fillRect(px + t / 2, py - t / 2, w - t, t);
    else ctx.fillRect(px - t / 2, py + t / 2, t, w - t);
  });
};

export const drawDateStamp = (ctx: CanvasRenderingContext2D, text: string) => {
  const { width, height } = ctx.canvas;
  const w = Math.min(width, height) * 0.035;
  const advance = w * 1.55;
  let x = width - text.length * advance - w * 1.5;
  const y = height - w * 2 - w * 1.5;
  ctx.save();
  ctx.fillStyle = '#ff8a1c';
  ctx.shadowColor = 'rgba(255, 90, 0, 0.9)';
  ctx.shadowBlur = w * 0.5;
  for (const ch of text) {
    if (ch === "'") ctx.fillRect(x + w * 0.3, y - w * 0.05, w * 0.18, w * 0.5);
    else if (ch !== ' ') drawDigit(ctx, Number(ch), x, y, w);
    x += ch === "'" ? advance * 0.5 : ch === ' ' ? advance * 0.6 : advance;
  }
  ctx.restore();
};

export const drawRunMark = (ctx: CanvasRenderingContext2D, text: string) => {
  const { height } = ctx.canvas;
  const size = Math.max(ctx.canvas.width, height) * 0.022;
  ctx.save();
  ctx.font = `${size}px Georgia, serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = size * 0.3;
  ctx.fillText(text, size * 1.2, height - size * 1.2);
  ctx.restore();
};
