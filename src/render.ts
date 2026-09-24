import { applyStyle, type StyleParams } from './filters';
import { drawDateStamp, drawRunMark, stampText } from './stamp';

/** Ořez ve zlomcích (0–1) orientovaného obrázku */
export type Crop = { x: number; y: number; w: number; h: number };

export type Look = { style: StyleParams; run: string; gameDate: string };

// 10×15 cm při 300 dpi
const LONG = 1800;
const SHORT = 1200;

/** Středový ořez 3:2 v orientaci podle tvaru fotky */
export const centerCrop = (imgW: number, imgH: number, portrait = imgH > imgW): Crop => {
  const ratio = portrait ? 2 / 3 : 3 / 2;
  const w = Math.min(imgW, imgH * ratio);
  const h = w / ratio;
  return { x: (imgW - w) / 2 / imgW, y: (imgH - h) / 2 / imgH, w: w / imgW, h: h / imgH };
};

export const renderPhoto = (bmp: CanvasImageSource & { width: number; height: number }, crop: Crop, look: Look, seed: number, brightness = 1) => {
  const portrait = crop.h * bmp.height > crop.w * bmp.width;
  const canvas = document.createElement('canvas');
  canvas.width = portrait ? SHORT : LONG;
  canvas.height = portrait ? LONG : SHORT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  // Jas konkrétní fotky se použije před stylem fotografa, aby look stylu zůstal stejný
  ctx.filter = brightness === 1 ? 'none' : `brightness(${brightness})`;
  ctx.drawImage(
    bmp,
    crop.x * bmp.width, crop.y * bmp.height, crop.w * bmp.width, crop.h * bmp.height,
    0, 0, canvas.width, canvas.height,
  );
  ctx.filter = 'none';
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyStyle(px, look.style, seed);
  ctx.putImageData(px, 0, 0);
  drawRunMark(ctx, look.run);
  drawDateStamp(ctx, stampText(look.gameDate));
  return canvas;
};
