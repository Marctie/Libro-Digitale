// Costruisce docs/pages/NNNN.jpg da Phot/, ordinando per timestamp nel nome file,
// e genera docs/manifest.json con i metadati per il reader.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'Phot');
const OUT_DIR = path.join(__dirname, 'docs', 'pages');
const MANIFEST = path.join(__dirname, 'docs', 'manifest.json');

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

const pages = entries.map((e, i) => {
  const num = String(i + 1).padStart(4, '0');
  const ext = path.extname(e.file).toLowerCase();
  const outName = `${num}${ext}`;
  fs.copyFileSync(path.join(SRC, e.file), path.join(OUT_DIR, outName));
  return { page: i + 1, file: `pages/${outName}`, date: e.date, time: e.time };
});

fs.writeFileSync(MANIFEST, JSON.stringify({ total: pages.length, pages }, null, 2));
console.log(`Generate ${pages.length} pagine in docs/pages, manifest scritto in docs/manifest.json`);
