import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import '@fontsource/vt323/latin.css';
import '@fontsource/vt323/latin-ext.css';
import { activeGameDate, loadConfig, type Photographer } from './photographers';
import { centerCrop, renderPhoto, type Crop } from './render';
import { printPhotos, type Layout } from './print';
import { ensureArchiveAccess, saveToArchive } from './archive';
import { initAdmin } from './admin';
import { isShown, loadHidden, photoKey, saveHidden, withState, type HiddenMap, type PhotoState } from './hidden';

type Photo = { file: File; key: string; state?: PhotoState; selected: boolean; crop: Crop; brightness: number; edited: boolean; el: HTMLElement };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const cfg = loadConfig();
let who: Photographer | null = null;
let pinCheck: { pin: string; onOk: () => void } | null = null;
let photos: Photo[] = [];
let hiddenMap: HiddenMap = {};
let rendered: HTMLCanvasElement[] = [];

const show = (id: string) =>
  document.querySelectorAll<HTMLElement>('.screen').forEach((s) => (s.hidden = s.id !== id));

// --- Výběr fotografa + PIN ---

const renderWhoList = () => {
  $('who-list').replaceChildren(
    ...cfg.photographers.map((p) => {
      const b = document.createElement('button');
      b.textContent = p.name;
      b.onclick = () => askPin(p.name, p.pin, () => login(p));
      return b;
    }),
  );
};

const askPin = (label: string, pin: string, onOk: () => void) => {
  pinCheck = { pin, onOk };
  $('pin-form').hidden = false;
  $('pin-name').textContent = label;
  $('pin-error').textContent = '';
  const input = $<HTMLInputElement>('pin');
  input.value = '';
  input.focus();
};

$('pin-form').onsubmit = (e) => {
  e.preventDefault();
  if (!pinCheck || $<HTMLInputElement>('pin').value !== pinCheck.pin) {
    $('pin-error').textContent = 'Špatný PIN';
    return;
  }
  $('pin-form').hidden = true;
  pinCheck.onOk();
  pinCheck = null;
};

const login = (p: Photographer) => {
  who = p;
  hiddenMap = loadHidden(p.id);
  $('grid-who').textContent = p.name;
  show('screen-grid');
};

const openAdmin = initAdmin(cfg);
$('admin-btn').onclick = () =>
  askPin('administraci', cfg.adminPin, () => {
    openAdmin();
    show('screen-admin');
  });

$('admin-done').onclick = () => {
  renderWhoList();
  show('screen-who');
};

const logout = () => {
  who = null;
  photos = [];
  rendered = [];
  $('grid').replaceChildren();
  $('preview').replaceChildren();
  $('grid-status').textContent = '';
  $<HTMLInputElement>('show-hidden').checked = false;
  updateNext();
  show('screen-who');
};
document.querySelectorAll<HTMLElement>('.logout').forEach((b) => (b.onclick = logout));

// --- Karta a náhledy ---

const isJpeg = (name: string) => /\.jpe?g$/i.test(name);

const listJpegs = async (dir: FileSystemDirectoryHandle): Promise<File[]> => {
  const out: File[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === 'directory') out.push(...(await listJpegs(entry)));
    else if (isJpeg(entry.name)) out.push(await entry.getFile());
  }
  return out;
};

const updateNext = () => {
  const n = photos.filter((p) => p.selected).length;
  $<HTMLButtonElement>('to-preview').disabled = n === 0;
  $<HTMLButtonElement>('to-preview').textContent = n ? `Dál (${n}) →` : 'Dál →';
};

const thumbEl = (photo: Omit<Photo, 'el'>) => {
  const el = document.createElement('div');
  el.className = 'thumb';
  el.title = photo.file.name;
  el.innerHTML = '<button class="crop-btn">✂</button><button class="hide-btn"></button><span class="state"></span>';
  return el;
};

// --- Vytištěné a skryté fotky ---

const STATE_LABEL: Record<PhotoState, string> = { printed: 'vytištěno', hidden: 'skryto' };

const showHidden = () => $<HTMLInputElement>('show-hidden').checked;

const refreshPhoto = (p: Photo) => {
  const shown = isShown(p.state, showHidden());
  p.el.hidden = !shown;
  if (!shown && p.selected) {
    p.selected = false;
    p.el.classList.remove('selected');
  }
  p.el.classList.toggle('is-hidden', !!p.state);
  p.el.querySelector('.state')!.textContent = p.state ? STATE_LABEL[p.state] : '';
  p.el.querySelector('.hide-btn')!.textContent = p.state ? 'Odkrýt' : 'Skrýt';
};

const updateStatus = () => {
  const hidden = photos.filter((p) => p.state).length;
  $('grid-status').textContent = photos.length
    ? `${photos.length - hidden} fotek k tisku` + (hidden ? ` · ${hidden} skrytých` : '')
    : 'Žádné JPG fotky';
};

const refreshGrid = () => {
  photos.forEach(refreshPhoto);
  updateNext();
  updateStatus();
};

const setPhotoState = (list: Photo[], state: PhotoState | undefined) => {
  if (!who) return;
  hiddenMap = withState(hiddenMap, list.map((p) => p.key), state);
  saveHidden(who.id, hiddenMap);
  list.forEach((p) => (p.state = state));
  refreshGrid();
};

$('show-hidden').onchange = refreshGrid;

const addPhoto = async (file: File) => {
  const bmp = await createImageBitmap(file, { resizeWidth: 320, resizeQuality: 'medium' });
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  const key = photoKey(file);
  const photo: Photo = { file, key, state: hiddenMap[key], selected: false, edited: false, brightness: 1, crop: centerCrop(bmp.width, bmp.height), el: null! };
  bmp.close();
  photo.el = thumbEl(photo);
  photo.el.prepend(canvas);
  photo.el.onclick = () => {
    photo.selected = !photo.selected;
    photo.el.classList.toggle('selected', photo.selected);
    updateNext();
  };
  photo.el.querySelector<HTMLElement>('.crop-btn')!.onclick = (e) => {
    e.stopPropagation();
    openCrop(photo);
  };
  photo.el.querySelector<HTMLElement>('.hide-btn')!.onclick = (e) => {
    e.stopPropagation();
    setPhotoState([photo], photo.state ? undefined : 'hidden');
  };
  photos.push(photo);
  refreshPhoto(photo);
  $('grid').append(photo.el);
};

$('open-card').onclick = async () => {
  const dir = await window.showDirectoryPicker({ id: 'card', mode: 'read' }).catch(() => null);
  if (!dir) return;
  photos = [];
  $('grid').replaceChildren();
  updateNext();
  const files = (await listJpegs(dir)).sort((a, b) => a.lastModified - b.lastModified);
  for (const [i, f] of files.entries()) {
    $('grid-status').textContent = `Načítám ${i + 1}/${files.length}…`;
    await addPhoto(f).catch((err) => console.warn('Nelze načíst', f.name, err));
  }
  refreshGrid();
};

$('select-all').onclick = () => {
  const visible = photos.filter((p) => !p.el.hidden);
  const all = visible.some((p) => !p.selected);
  visible.forEach((p) => {
    p.selected = all;
    p.el.classList.toggle('selected', all);
  });
  updateNext();
};

// --- Ořez ---

let cropper: Cropper | null = null;
let cropping: Photo | null = null;
let cropSize = { w: 1, h: 1 };

const previewUrl = async (file: File) => {
  const bmp = await createImageBitmap(file, { resizeWidth: 1600, resizeQuality: 'high' });
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  cropSize = { w: c.width, h: c.height };
  return new Promise<string>((res) => c.toBlob((b) => res(URL.createObjectURL(b!)), 'image/jpeg', 0.9));
};

const openCrop = async (photo: Photo) => {
  cropping = photo;
  const img = $<HTMLImageElement>('crop-img');
  img.src = await previewUrl(photo.file);
  $<HTMLDialogElement>('crop-dialog').showModal();
  setBrightness(photo.brightness);
  const { x, y, w, h } = photo.crop;
  cropper = new Cropper(img, {
    viewMode: 1,
    checkOrientation: false,
    autoCropArea: 1,
    zoomable: false,
    aspectRatio: (w * cropSize.w) / (h * cropSize.h),
    data: { x: x * cropSize.w, y: y * cropSize.h, width: w * cropSize.w, height: h * cropSize.h },
  });
};

const closeCrop = () => {
  cropper?.destroy();
  cropper = null;
  URL.revokeObjectURL($<HTMLImageElement>('crop-img').src);
  $<HTMLDialogElement>('crop-dialog').close();
};

const brightnessInput = $<HTMLInputElement>('crop-brightness');

const setBrightness = (b: number) => {
  brightnessInput.value = String(Math.round(b * 100));
  $('crop-brightness-value').textContent = `${brightnessInput.value} %`;
  $('crop-dialog').style.setProperty('--brightness', String(b));
};

brightnessInput.oninput = () => setBrightness(Number(brightnessInput.value) / 100);
$('crop-brightness-reset').onclick = () => setBrightness(1);

$('crop-rotate').onclick = () => {
  if (!cropper || !cropping) return;
  const { width, height } = cropper.getData();
  cropper.setAspectRatio(width > height ? 2 / 3 : 3 / 2);
};

$('crop-ok').onclick = () => {
  if (cropper && cropping) {
    const d = cropper.getData(true);
    cropping.crop = { x: d.x / cropSize.w, y: d.y / cropSize.h, w: d.width / cropSize.w, h: d.height / cropSize.h };
    cropping.brightness = Number(brightnessInput.value) / 100;
    cropping.edited = true;
    if (!cropping.selected) cropping.el.click();
    cropping.el.querySelector('.cropped')?.remove();
    cropping.el.insertAdjacentHTML('beforeend', '<span class="cropped">upraveno</span>');
  }
  closeCrop();
};
$('crop-cancel').onclick = closeCrop;
$('crop-dialog').addEventListener('cancel', closeCrop);

// --- Náhled, tisk, archiv ---

const seedOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const nextFrame = () => new Promise(requestAnimationFrame);

$('to-preview').onclick = async () => {
  if (!who) return;
  show('screen-preview');
  $<HTMLButtonElement>('print-btn').disabled = true;
  $('preview').replaceChildren();
  rendered = [];
  const selected = photos.filter((p) => p.selected);
  for (const [i, p] of selected.entries()) {
    $('preview-status').textContent = `Vyvolávám ${i + 1}/${selected.length}…`;
    await nextFrame();
    const bmp = await createImageBitmap(p.file);
    const look = { style: cfg.styles[who.style], run: cfg.run, gameDate: activeGameDate(cfg) };
    const canvas = renderPhoto(bmp, p.crop, look, seedOf(p.file.name), p.brightness);
    bmp.close();
    rendered.push(canvas);
    $('preview').append(canvas);
  }
  $('preview-status').textContent = `${rendered.length} fotek připraveno`;
  $<HTMLButtonElement>('print-btn').disabled = false;
};

$('back').onclick = () => show('screen-grid');

const stamp = () => new Date().toLocaleString('sv').replace(/[-:]/g, '').replace(' ', '-');

$('print-btn').onclick = async () => {
  if (!who) return;
  const archive = await ensureArchiveAccess();
  const layout = document.querySelector<HTMLInputElement>('input[name=layout]:checked')!.value as Layout;
  const selected = photos.filter((p) => p.selected);
  $('preview-status').textContent = 'Ukládám do archivu…';
  if (archive) {
    const prefix = stamp();
    await Promise.all(
      rendered.map((c, i) => saveToArchive(archive, who!.id, `${prefix}_${selected[i].file.name}`, c)),
    );
    $('preview-status').textContent = `Uloženo do archivu (${rendered.length})`;
  } else {
    $('preview-status').textContent = '⚠ Archiv není nastaven — fotky se neuložily';
  }
  await printPhotos(rendered, layout);
  setPhotoState(selected, 'printed');
  if (archive) logout();
};

renderWhoList();
