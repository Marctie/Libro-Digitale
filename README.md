# Libro Digitale

Reader online per appunti digitalizzati, generato a partire da screenshot personali e pubblicato su GitHub Pages.

## Come funziona

1. Le foto sorgente (non incluse nel repo) vanno in una cartella `Phot/`, con nome tipo `Screenshot_AAAA-MM-GG-HH-MM-SS-mmm_*.jpg`.
2. `node build.js` le ordina cronologicamente e genera:
   - `docs/pages/0001.jpg`, `0002.jpg`, ... (pagine numerate in ordine di lettura)
   - `docs/manifest.json` (elenco pagine + data/ora originali)
3. GitHub Pages serve la cartella `docs/` come sito statico.

## Sviluppo locale

Apri `docs/index.html` con un piccolo server statico (es. `npx serve docs`) per testare il reader.
