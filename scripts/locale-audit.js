const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, files);
    else files.push(p);
  });
  return files;
}

function flatten(obj, prefix = '') {
  let res = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object') Object.assign(res, flatten(v, key));
    else res[key] = v;
  }
  return res;
}

function setNested(obj, pathArr, value) {
  let cur = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const p = pathArr[i];
    if (!Object.prototype.hasOwnProperty.call(cur, p) || typeof cur[p] !== 'object') {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[pathArr[pathArr.length - 1]] = value;
}

function ensureKeyPath(obj, key, value) {
  const parts = key.split('.');
  setNested(obj, parts, value);
}

function isCodeKey(k) {
  if (!k || typeof k !== 'string') return false;
  if (k.includes('${')) return true;
  if (k.includes('/api/')) return true;
  if (k.includes('http://') || k.includes('https://')) return true;
  if (k.startsWith('./') || k.startsWith('../')) return true;
  if (k.includes('%')) return true;
  if (/\{[^}]+\}/.test(k)) return true;
  return false;
}

const src = path.join('frontend', 'src');
const files = walk(src).filter(f => f.match(/\.(ts|tsx|js|jsx)$/));
const usedKeys = new Set();
const fileUsage = {};
files.forEach(f => {
  const txt = fs.readFileSync(f, 'utf8');
  const nsMatch = txt.match(/useTranslations\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  const ns = nsMatch ? nsMatch[1] : null;
  const tMatches = [...txt.matchAll(/t\(\s*['"`]([^'"`]+)['"`]\s*\)/g)];
  if (tMatches.length) {
    fileUsage[f] = [];
    tMatches.forEach(m => {
      const key = m[1];
      const full = key.includes('.') ? key : (ns ? ns + '.' + key : key);
      usedKeys.add(full);
      fileUsage[f].push(full);
    });
  }
});

const localesDir = path.join('frontend', 'src', 'locales');
const localeFiles = fs.readdirSync(localesDir).filter(x => x.endsWith('.json'));
const localeData = {};
for (const lf of localeFiles) {
  const filepath = path.join(localesDir, lf);
  const txt = fs.readFileSync(filepath, 'utf8');
  try {
    localeData[lf] = JSON.parse(txt);
  } catch (e) {
    console.error('JSON_PARSE_ERROR', lf, e.message);
    process.exit(2);
  }
}

const used = [...usedKeys].sort();
console.log('FOUND_KEYS', used.length);

// Build flattened map of en-US to use as source of truth for placeholders
const enFile = localeFiles.find(x => x.toLowerCase().startsWith('en'));
const enFlat = enFile ? flatten(localeData[enFile]) : {};

// Compute union of keys across used keys and existing locale keys
const unionSet = new Set(used);
localeFiles.forEach(lf => {
  const flat = flatten(localeData[lf]);
  Object.keys(flat).forEach(k => unionSet.add(k));
});
const unionKeys = [...unionSet].sort();

const added = {};
for (const lf of localeFiles) added[lf] = [];

// For each key in the union, ensure each locale has it (prefer en-US value, else any existing, else empty)
unionKeys.forEach(key => {
  localeFiles.forEach(lf => {
    const flat = flatten(localeData[lf]);
    if (!Object.prototype.hasOwnProperty.call(flat, key)) {
      const placeholder = enFlat[key] !== undefined ? enFlat[key] : (() => {
        for (const lf2 of localeFiles) {
          const flat2 = flatten(localeData[lf2]);
          if (flat2[key] !== undefined) return flat2[key];
        }
        return '';
      })();
      ensureKeyPath(localeData[lf], key, placeholder);
      added[lf].push(key);
    }
  });
});

// Translate missing entries using LibreTranslate and write files
const https = require('https');
function libreTranslate(text, source = 'en', target = 'pt') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ q: text, source, target, format: 'text' });
    const options = {
      hostname: 'libretranslate.de',
      path: '/translate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const obj = JSON.parse(data);
          if (obj && obj.translatedText !== undefined) resolve(obj.translatedText);
          else reject(new Error('Invalid response'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function preservePlaceholdersAndTranslate(text, srcLang, tgtLang) {
  if (!text || typeof text !== 'string') return Promise.resolve(text);
  const placeholders = text.match(/\{[^}]+\}/g) || [];
  let tmp = text;
  const tokens = [];
  placeholders.forEach((ph, i) => {
    const token = `___PH_${i}___`;
    tmp = tmp.replace(ph, token);
    tokens.push({ token, ph });
  });
  return libreTranslate(tmp, srcLang, tgtLang).then(translated => {
    let out = translated;
    tokens.forEach(t => { out = out.replace(t.token, t.ph); });
    return out;
  });
}

async function translateAndWrite() {
  for (const lf of localeFiles) {
    const lang = lf.toLowerCase().startsWith('pt') ? 'pt' : (lf.toLowerCase().startsWith('es') ? 'es' : 'en');
    const toTranslate = added[lf];
    for (const key of toTranslate) {
      // skip code-like keys (URLs, template tokens, percent values, file paths) — copy source text literally
      function isCodeKey(k) {
        if (!k || typeof k !== 'string') return false;
        if (k.includes('${')) return true;
        if (k.includes('/api/')) return true;
        if (k.includes('http://') || k.includes('https://')) return true;
        if (k.startsWith('./') || k.startsWith('../')) return true;
        if (k.includes('%')) return true;
        if (/\{[^}]+\}/.test(k)) return true;
        return false;
      }
      if (isCodeKey(key)) {
        const sourceText = enFlat[key] !== undefined ? enFlat[key] : (() => { for (const lf2 of localeFiles) { const flat2 = flatten(localeData[lf2]); if (flat2[key] !== undefined) return flat2[key]; } return key; })();
        // literally copy the source text (or the key itself if not found) into target locale
        ensureKeyPath(localeData[lf], key, sourceText);
        continue;
      }
      // value already set to enFlat or '' by earlier pass; we'll translate if needed
      const parts = key.split('.');
      // source text: prefer enFlat, else any existing locale value
      const sourceText = enFlat[key] || (() => {
        // try other locales
        for (const lf2 of localeFiles) {
          const flat2 = flatten(localeData[lf2]);
          if (flat2[key]) return flat2[key];
        }
        return '';
      })();
      try {
        if (lang === 'en') {
          // ensure en keeps sourceText (no translation)
          if (!sourceText) {
            // generate humanized key
            const human = parts[parts.length-1].replace(/_/g, ' ');
            ensureKeyPath(localeData[lf], key, human);
          } else {
            ensureKeyPath(localeData[lf], key, sourceText);
          }
        } else {
          const translated = sourceText ? await preservePlaceholdersAndTranslate(sourceText, 'en', lang) : '';
          ensureKeyPath(localeData[lf], key, translated);
        }
      } catch (e) {
        console.error('TRANSLATE_ERROR', lf, key, e.message);
        // fallback to sourceText or empty
        ensureKeyPath(localeData[lf], key, sourceText || '');
      }
    }
  }

  // Backup and write files
  localeFiles.forEach(lf => {
    const filepath = path.join(localesDir, lf);
    const bak = filepath + '.bak';
    try { fs.copyFileSync(filepath, bak); } catch (e) {}
    fs.writeFileSync(filepath, JSON.stringify(localeData[lf], null, 2) + '\n', 'utf8');
  });
}

(async () => {
  // Import keys that exist in pt-BR or es-ES but are missing in en-US
  const ptFile = localeFiles.find(x => x.toLowerCase().startsWith('pt'));
  const esFile = localeFiles.find(x => x.toLowerCase().startsWith('es'));
  const ptFlat = ptFile ? flatten(localeData[ptFile]) : {};
  const esFlat = esFile ? flatten(localeData[esFile]) : {};
  const missingInEn = new Set();
  Object.keys(ptFlat).forEach(k => { if (!enFlat[k]) missingInEn.add(k); });
  Object.keys(esFlat).forEach(k => { if (!enFlat[k]) missingInEn.add(k); });
  if (missingInEn.size) {
    console.log('IMPORT_TO_EN_MISSING', missingInEn.size);
    for (const key of missingInEn) {
      // if key looks like code, copy literal source text
      try {
        if (isCodeKey(key)) {
          const sourceText = ptFlat[key] || esFlat[key] || key;
          ensureKeyPath(localeData[enFile], key, sourceText);
          enFlat[key] = sourceText;
          added[enFile].push(key);
          continue;
        }
        const sourceText = ptFlat[key] || esFlat[key] || '';
        const srcLang = ptFlat[key] ? 'pt' : (esFlat[key] ? 'es' : 'en');
        const translated = sourceText ? await preservePlaceholdersAndTranslate(sourceText, srcLang, 'en') : '';
        ensureKeyPath(localeData[enFile], key, translated || sourceText || '');
        enFlat[key] = translated || sourceText || '';
        added[enFile].push(key);
      } catch (e) {
        console.error('IMPORT_TO_EN_ERROR', key, e.message);
        const fallback = ptFlat[key] || esFlat[key] || '';
        ensureKeyPath(localeData[enFile], key, fallback);
        enFlat[key] = fallback;
        added[enFile].push(key);
      }
    }
  }

  await translateAndWrite();

  // Report
  localeFiles.forEach(lf => {
    const total = Object.keys(flatten(localeData[lf])).length;
    console.log('LOCALE', lf, 'TOTAL_KEYS_AFTER', total, 'ADDED', added[lf].length);
    if (added[lf].length) {
      console.log('SAMPLES_ADDED');
      added[lf].slice(0, 50).forEach(k => console.log(' -', k));
    }
  });

  console.log('\nFILES_WITH_TRANSLATIONS', Object.keys(fileUsage).length);
  for (const f of Object.keys(fileUsage)) {
    console.log(f, fileUsage[f].length);
  }

  console.log('\nDone. Backups written as *.bak for each locale file.');
})();

// Report
localeFiles.forEach(lf => {
  const total = Object.keys(flatten(localeData[lf])).length;
  console.log('LOCALE', lf, 'TOTAL_KEYS_AFTER', total, 'ADDED', added[lf].length);
  if (added[lf].length) {
    console.log('SAMPLES_ADDED');
    added[lf].slice(0, 50).forEach(k => console.log(' -', k));
  }
});

console.log('\nFILES_WITH_TRANSLATIONS', Object.keys(fileUsage).length);
for (const f of Object.keys(fileUsage)) {
  console.log(f, fileUsage[f].length);
}

console.log('\nDone. Backups written as *.bak for each locale file.');
