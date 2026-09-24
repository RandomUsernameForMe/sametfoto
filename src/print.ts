export type Layout = '10x15' | 'a4';

const PAGE_CSS: Record<Layout, string> = {
  '10x15': '@page { size: 100mm 150mm; margin: 0 }',
  a4: '@page { size: A4; margin: 10mm }',
};

/** Tisk je vždy na výšku — fotky na šířku se otočí o 90° */
const toPortrait = (c: HTMLCanvasElement) => {
  if (c.height >= c.width) return c;
  const r = document.createElement('canvas');
  r.width = c.height;
  r.height = c.width;
  const ctx = r.getContext('2d')!;
  ctx.translate(r.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(c, 0, 0);
  return r;
};

const toUrl = (c: HTMLCanvasElement) =>
  new Promise<string>((res) => c.toBlob((b) => res(URL.createObjectURL(b!)), 'image/jpeg', 0.95));

export const printPhotos = async (canvases: HTMLCanvasElement[], layout: Layout) => {
  const root = document.getElementById('print')!;
  const urls = await Promise.all(canvases.map(toPortrait).map(toUrl));
  root.className = `layout-${layout}`;
  root.innerHTML = `<style>${PAGE_CSS[layout]}</style>` + urls.map((u) => `<img src="${u}">`).join('');
  await Promise.all([...root.querySelectorAll('img')].map((i) => i.decode()));
  window.print();
  root.innerHTML = '';
  urls.forEach(URL.revokeObjectURL);
};
