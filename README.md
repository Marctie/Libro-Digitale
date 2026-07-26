# Libro Digitale

Reader online per appunti digitalizzati, generato a partire da screenshot personali e pubblicato su GitHub Pages.

## Come funziona

1. Le foto sorgente (non incluse nel repo) vanno in una cartella `Phot/`, con nome tipo `Screenshot_AAAA-MM-GG-HH-MM-SS-mmm_*.jpg`.
2. `npm install` (una volta sola) installa `tesseract.js`, usato per l'OCR.
3. `node build.js` ordina le foto cronologicamente, esegue l'OCR di ogni pagina e genera:
   - `docs/pages/0001.jpg`, `0002.jpg`, ... (pagine numerate in ordine di lettura)
   - `docs/manifest.json` (elenco pagine + data/ora originali + testo OCR di ogni pagina)
4. GitHub Pages serve la cartella `docs/` come sito statico.

L'OCR gira in locale con `tesseract.js` (nessuna API key, nessun costo). Su un rebuild, le pagine gia' presenti nel manifest non vengono ri-processate (il testo viene riusato), quindi solo le pagine nuove/aggiunte richiedono OCR. Per saltare l'OCR (es. per un rebuild veloce delle sole immagini): `node build.js --no-ocr`.

Il testo OCR alimenta anche la ricerca full-text nel reader (icona 🔍) e rende il contenuto del libro leggibile/analizzabile da Claude semplicemente dando il link a `manifest.json` pubblicato su GitHub Pages.

## Sviluppo locale

Apri `docs/index.html` con un piccolo server statico (es. `npx serve docs`) per testare il reader.
