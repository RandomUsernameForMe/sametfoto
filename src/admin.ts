import { STYLE_IDS, styleLabel, type StyleId, type StyleParams } from './filters';
import { activeGameDate, defaultStyle, saveConfig, type Config, type Photographer } from './photographers';
import { centerCrop, renderPhoto } from './render';
import { getArchive, pickArchive } from './archive';
import { makeBackup, parseBackup } from './backup';
import { loadAll, saveAll } from './hidden';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]) => {
  const e: HTMLElementTagNameMap[K] = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

type NumKey = { [K in keyof StyleParams]: StyleParams[K] extends number ? K : never }[keyof StyleParams];

const SLIDERS: [NumKey, string, number, number, number][] = [
  ['exposure', 'Expozice', -1, 1, 0.05],
  ['contrast', 'Kontrast', -1, 1, 0.05],
  ['fade', 'Vybledlé černé', 0, 80, 1],
  ['warmth', 'Teplota (− studená / + teplá)', -50, 50, 1],
  ['tint', 'Tint (− purpurová / + zelená)', -50, 50, 1],
  ['saturation', 'Saturace', 0, 2, 0.05],
  ['grain', 'Zrno', 0, 40, 1],
  ['vignette', 'Vinětace', 0, 1, 0.05],
  ['chromaShift', 'Barevný posun (lo-fi)', 0, 6, 1],
];

const slider = (label: string, value: number, min: number, max: number, step: number, onInput: (v: number) => void) => {
  const out = el('output', { value: String(value) });
  const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) });
  input.oninput = () => {
    out.value = input.value;
    onInput(Number(input.value));
  };
  return el('label', { className: 'slider' }, el('span', {}, label), input, out);
};

/** Testovací obrazec, dokud admin nenahraje vlastní fotku */
const testChart = () => {
  const c = el('canvas', { width: 1500, height: 1000 });
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, '#3d7fd1');
  sky.addColorStop(1, '#cfe3f5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1500, 600);
  ['#c0392b', '#27ae60', '#2c5fb3', '#f1c40f', '#e0ac8a', '#8d5524'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(40 + i * 240, 180, 200, 300);
  });
  for (let i = 0; i < 16; i++) {
    const g = Math.round((i / 15) * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(i * 94, 600, 94, 400);
  }
  return c;
};

export const initAdmin = (cfg: Config) => {
  let sample: HTMLCanvasElement | ImageBitmap = testChart();
  let current: StyleId = STYLE_IDS[0];
  let queued = false;
  const save = () => saveConfig(cfg);

  const drawPreview = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const look = { style: cfg.styles[current], run: cfg.run, gameDate: activeGameDate(cfg) };
      const out = renderPhoto(sample, centerCrop(sample.width, sample.height), look, 1);
      const view = $<HTMLCanvasElement>('st-preview');
      view.width = out.width;
      view.height = out.height;
      view.getContext('2d')!.drawImage(out, 0, 0);
    });
  };

  const styleOptions = (selected: StyleId) =>
    STYLE_IDS.map((id) => el('option', { value: id, textContent: styleLabel(id), selected: id === selected }));

  // --- Fotografové ---

  const photographerRow = (p: Photographer) => {
    const text = (key: 'name' | 'pin') => {
      const input = el('input', { value: p[key] });
      input.onchange = () => {
        p[key] = input.value.trim();
        save();
      };
      return el('td', {}, input);
    };
    const select = el('select', {}, ...styleOptions(p.style));
    select.onchange = () => {
      p.style = select.value as StyleId;
      save();
    };
    const del = el('button', { type: 'button', textContent: 'Smazat' });
    del.onclick = () => {
      cfg.photographers.splice(cfg.photographers.indexOf(p), 1);
      save();
      renderPhotographers();
    };
    return el('tr', {}, text('name'), text('pin'), el('td', {}, select), el('td', {}, del));
  };

  const renderPhotographers = () =>
    $('ph-rows').replaceChildren(...cfg.photographers.map(photographerRow));

  $('ph-add').onclick = () => {
    const n = cfg.photographers.length + 1;
    cfg.photographers.push({ id: `f${Date.now().toString(36)}`, name: `Fotograf ${n}`, pin: '0000', style: STYLE_IDS[0] });
    save();
    renderPhotographers();
  };

  // --- Styly ---

  const tintSliders = (key: 'shadowTint' | 'highlightTint', label: string) =>
    (['R', 'G', 'B'] as const).map((ch, i) =>
      slider(`${label} ${ch}`, cfg.styles[current][key][i], -80, 80, 1, (v) => {
        cfg.styles[current][key][i] = v;
        save();
        drawPreview();
      }),
    );

  const renderSliders = () => {
    const s = cfg.styles[current];
    const mono = el('input', { type: 'checkbox', checked: s.mono });
    mono.onchange = () => {
      s.mono = mono.checked;
      save();
      drawPreview();
    };
    $('st-sliders').replaceChildren(
      el('label', { className: 'slider' }, el('span', {}, 'Černobílý'), mono),
      ...SLIDERS.map(([key, label, min, max, step]) =>
        slider(label, s[key], min, max, step, (v) => {
          s[key] = v;
          save();
          drawPreview();
        }),
      ),
      ...tintSliders('shadowTint', 'Barva stínů'),
      ...tintSliders('highlightTint', 'Barva světel'),
    );
    drawPreview();
  };

  const select = $<HTMLSelectElement>('st-select');
  select.onchange = () => {
    current = select.value as StyleId;
    renderSliders();
  };

  $('st-reset').onclick = () => {
    cfg.styles[current] = defaultStyle(current);
    save();
    renderSliders();
  };

  $<HTMLInputElement>('st-photo').onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    sample = await createImageBitmap(file);
    drawPreview();
  };

  // --- Nastavení ---

  const dateRow = (iso: string, i: number) => {
    const radio = el('input', { type: 'radio', name: 'active-date', checked: i === cfg.activeDate });
    radio.onchange = () => {
      cfg.activeDate = i;
      save();
      drawPreview();
    };
    const input = el('input', { type: 'date', value: iso, required: true });
    input.onchange = () => {
      if (input.value) cfg.gameDates[i] = input.value;
      input.value = cfg.gameDates[i];
      save();
      drawPreview();
    };
    return el('label', { className: 'date-row' }, radio, `Den ${i + 1}`, input);
  };

  const renderDates = () => $('set-dates').replaceChildren(...cfg.gameDates.map(dateRow));

  const renderRun = () =>
    $('set-run').replaceChildren(
      ...(['A', 'B'] as const).map((r) => {
        const radio = el('input', { type: 'radio', name: 'run', checked: cfg.run === r });
        radio.onchange = () => {
          cfg.run = r;
          save();
          drawPreview();
        };
        return el('label', { className: 'date-row' }, radio, `Běh ${r}`);
      }),
    );

  const pin = $<HTMLInputElement>('set-admin-pin');
  pin.onchange = () => {
    if (pin.value.trim()) cfg.adminPin = pin.value.trim();
    pin.value = cfg.adminPin;
    save();
  };

  const showArchiveName = async () => {
    $('archive-name').textContent = (await getArchive())?.name ?? 'nenastaven';
  };
  $('archive-btn').onclick = async () => {
    await pickArchive().catch(() => null);
    await showArchiveName();
  };

  $('backup-export').onclick = () => {
    const json = JSON.stringify(makeBackup(cfg, loadAll()), null, 2);
    const a = el('a', { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: `fotolab-nastaveni-${new Date().toLocaleDateString('sv')}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const fileInput = $<HTMLInputElement>('backup-file');
  $('backup-import').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const { config, hidden } = parseBackup(await file.text());
      if (!confirm('Import přepíše celé nastavení na tomto notebooku. Pokračovat?')) return;
      saveConfig(config);
      saveAll(hidden);
      location.reload();
    } catch (e) {
      $('backup-status').textContent = (e as Error).message;
    }
  };

  return () => {
    $('backup-status').textContent = '';
    renderPhotographers();
    select.replaceChildren(...styleOptions(current));
    renderSliders();
    renderDates();
    renderRun();
    pin.value = cfg.adminPin;
    showArchiveName();
  };
};
