# Fotolab (SametFoto)

An offline photo lab for a LARP set in the 1990s. In-game photographers bring their shots to a laptop, crop them, adjust brightness and print them as period-looking photos — all in a DOS / Norton Commander style interface.

## Features

- **Photographer login** with a PIN, then upload photos from a memory card.
- **Crop and brightness** per photo (Cropper.js), batch selection, printing on 10×15 or A4.
- **Period stamp** — the in-game date and the run letter (A/B) are printed onto each photo.
- **Archive** — printed photos are saved to a local folder through the File System Access API.
- **Admin** — photographers, styles, game date, hidden/printed photos, and JSON export/import of all settings for moving to another laptop.
- **Fully offline** — `npm run package` produces a single `Fotolab.html` with everything inlined, fonts included.

## Stack

TypeScript and Vite, no framework. `vite-plugin-singlefile` for the one-file build, Vitest for unit tests.

## Running locally

```bash
npm install
npm run dev
npm test
npm run package   # → dist/Fotolab.html
```

---

🇨🇿 **Česky:** Offline fotolab pro LARP z 90. let. Herní fotografové si na notebooku ořežou fotky, upraví jas a vytisknou je s dobovým razítkem. Retro DOS rozhraní, archiv do složky, záloha nastavení do JSON a celá aplikace v jednom HTML souboru bez internetu.
