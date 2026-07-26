// Costruisce docs/pages/NNNN.jpg da Phot/, ordinando per timestamp nel nome file,
// esegue l'OCR di ogni pagina e genera docs/manifest.json con metadati + testo estratto.
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');

const SRC = path.join(__dirname, 'Phot');
const OUT_DIR = path.join(__dirname, 'docs', 'pages');
const MANIFEST = path.join(__dirname, 'docs', 'manifest.json');
const SKIP_OCR = process.argv.includes('--no-ocr');

const RE = /^Screenshot_(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{3})_/;

function parseStamp(name) {
  const m = name.match(RE);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, ms] = m;
  return {
    key: `${y}${mo}${d}${h}${mi}${s}${ms}`,
    date: `${y}-${mo}-${d}`,
    time: `${h}:${mi}:${s}`,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SRC).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const entries = files.map(f => {
    const stamp = parseStamp(f);
    if (!stamp) {
      console.warn('Nome file non riconosciuto, ignorato:', f);
      return null;
    }
    return { file: f, ...stamp };
  }).filter(Boolean);

  entries.sort((a, b) => a.key.localeCompare(b.key));

  // pulisce output precedente
  for (const f of fs.readdirSync(OUT_DIR)) fs.unlinkSync(path.join(OUT_DIR, f));

  // riusa il testo OCR gia' presente nel manifest precedente, indicizzato per nome file originale,
  // cosi' un rebuild senza nuove pagine non rilancia l'OCR su tutto
  let previousText = {};
  if (fs.existsSync(MANIFEST)) {
    try {
      const prev = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
      for (const p of prev.pages || []) {
        if (p.sourceFile && p.text) previousText[p.sourceFile] = p.text;
      }
    } catch {
      // manifest precedente illeggibile, si riparte da zero
    }
  }

  const outFiles = entries.map((e, i) => {
    const num = String(i + 1).padStart(4, '0');
    const ext = path.extname(e.file).toLowerCase();
    const outName = `${num}${ext}`;
    fs.copyFileSync(path.join(SRC, e.file), path.join(OUT_DIR, outName));
    return { ...e, page: i + 1, outName };
  });

  let worker = null;
  if (!SKIP_OCR) {
    worker = await createWorker('eng');
  }

  const pages = [];
  for (const e of outFiles) {
    let text = previousText[e.file] || '';
    if (worker && !text) {
      process.stdout.write(`OCR pagina ${e.page}/${outFiles.length}...\r`);
      const { data } = await worker.recognize(path.join(OUT_DIR, e.outName));
      text = data.text.trim();
    }
    pages.push({
      page: e.page,
      file: `pages/${e.outName}`,
      sourceFile: e.file,
      date: e.date,
      time: e.time,
      text,
    });
  }

  if (worker) {
    await worker.terminate();
    console.log(`\nOCR completato per ${outFiles.length} pagine.`);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify({ total: pages.length, pages }, null, 2));
  console.log(`Generate ${pages.length} pagine in docs/pages, manifest scritto in docs/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
