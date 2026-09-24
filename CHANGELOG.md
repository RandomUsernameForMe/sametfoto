# Changelog

## [2026-09-25] - Písmeno běhu místo podpisu fotografa
- Na fotce už není jméno/podpis fotografa; sloupec „Podpis na fotce“ z administrace odstraněn
- Administrace → Nastavení hry: přepínač „Běh A / B“, písmeno se tiskne malé a průsvitné do levého dolního rohu
- Běh je součástí exportu nastavení; starší záloha bez běhu se naimportuje jako běh A

## [2026-09-24] - Název v aplikaci „Fotolab“
- V aplikaci se zobrazuje jen „Fotolab“ (titulek okna, nadpis, hlášky importu); SametFoto zůstává pracovní název projektu
- `npm run package` vytváří `dist/Fotolab.html`, export nastavení se jmenuje `fotolab-nastaveni-<datum>.json`
- Interní klíče úložiště beze změny, uložené nastavení zůstává

## [2026-09-24] - Přenositelnost: jeden soubor a záloha nastavení
- `npm run package` vytvoří `dist/SametFoto.html`, jediný soubor ke zkopírování na jiný notebook
- Administrace: „Exportovat nastavení“ / „Importovat nastavení“ (JSON s fotografy, styly, herními daty, admin PINem a seznamem vytištěných/skrytých fotek); import soubor ověří, před přepsáním se zeptá. Složka archivu se nepřenáší.

## [2026-09-24] - Tlačítko „Nahrát fotky“
- Tlačítko „Otevřít kartu“ přejmenováno na „Nahrát fotky“

## [2026-09-24] - Retro vzhled DOS
- Nový vzhled ve stylu DOS / Norton Commander: modré pozadí, dvojité rámečky, písmo VT323, tlačítka `[ … ]` se stínem
- Písmo VT323 je přibalené (`@fontsource/vt323`, latin + latin-ext), aplikace dál funguje offline
- Rozvržení a ovládání beze změny

## [2026-09-24] - Jas v detailu fotky
- Detail fotky (✂): posuvník jasu 50–150 % s živým náhledem a tlačítkem „Původní jas“
- Jas se aplikuje na konkrétní fotku před stylem fotografa; upravené fotky mají štítek „upraveno“

## [2026-09-24] - Skrývání vytištěných a ručně skrytých fotek
- Vytištěné fotky se fotografovi při dalším otevření karty automaticky schovají (pamatuje se per fotograf v localStorage)
- Tlačítko Skrýt/Odkrýt u každé fotky, checkbox „Zobrazit skryté“ ukáže i skryté se štítkem vytištěno/skryto
- Oprava: atribut `hidden` nepřebil CSS `display` (PIN formulář se po přihlášení neschovával)

## [2026-09-24] - Tři herní data s přepínáním
- Admin: místo herního roku 3 herní data (Den 1–3) a přepínač aktuálního dne
- Datumovka ukazuje celé aktivní herní datum (dřív herní rok + skutečný měsíc a den focení)

## [2026-09-24] - Administrace, skryté názvy stylů
- Admin za PINem (výchozí 0000): správa fotografů (jméno, PIN, podpis, styl), ladění stylů posuvníky s živým náhledem, herní rok, admin PIN, složka archivu
- Styly přepsány na parametrický model (expozice, kontrast, fade, teplota, tint, saturace, ČB, barva stínů/světel, zrno, vinětace, barevný posun)
- Nastavení se ukládá do localStorage prohlížeče
- UI zobrazuje styly jen jako „Styl 1–6“, výchozí podpisy neutrální

## [2026-09-24] - První verze SametFoto
- Výběr fotografa s PINem, načtení JPG z karty (rekurzivně), náhledy, ořez 3:2 (na výšku/šířku)
- 6 stylů z 90s (Kodak Gold, Fuji chrom, Tri-X, Cross-process, Bulvár, Lo-fi CCD), oranžová 7seg datumovka s herním rokem, podpis fotografa
- Tisk 10×15 (1 na list) nebo A4 (4 na list), ukládání kopií do archivu `<archiv>/<id fotografa>/`
