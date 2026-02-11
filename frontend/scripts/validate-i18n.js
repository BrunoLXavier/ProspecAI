#!/usr/bin/env node
// Implements RF-09: i18n validation, synchronization AND translation script
// Ensures all 3 locale files (pt-BR, en-US, es-ES) share the same key structure.
// Missing/wrong-language keys are TRANSLATED using built-in dictionaries.
// Optional backend API fallback for remaining terms (I18N_USE_API=true).

const fs = require('fs');
const path = require('path');
const http = require('http');

const LOCALES_DIR = path.resolve(__dirname, '..', 'src', 'locales');
const PRIMARY_LOCALE = 'pt-BR';
const SECONDARY_LOCALES = ['en-US', 'es-ES'];
const ALL_LOCALES = [PRIMARY_LOCALE, ...SECONDARY_LOCALES];
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const USE_API = process.env.I18N_USE_API === 'true';

// ────────────────────────────────────────────────────────────
// Load translation dictionaries from external JSON files
// ────────────────────────────────────────────────────────────
const DICT_DIR = path.resolve(__dirname, 'i18n-dicts');
let PT_TO_EN = {};
let PT_TO_ES = {};

try {
  PT_TO_EN = JSON.parse(fs.readFileSync(path.join(DICT_DIR, 'pt-en.json'), 'utf-8'));
} catch { console.warn('⚠️  pt-en.json dictionary not found, using empty dict'); }
try {
  PT_TO_ES = JSON.parse(fs.readFileSync(path.join(DICT_DIR, 'pt-es.json'), 'utf-8'));
} catch { console.warn('⚠️  pt-es.json dictionary not found, using empty dict'); }

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(sortKeysDeep(data), null, 2) + '\n', 'utf-8');
}

function sortKeysDeep(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  const sorted = {};
  Object.keys(obj).sort((a, b) => a.localeCompare(b)).forEach(key => {
    sorted[key] = sortKeysDeep(obj[key]);
  });
  return sorted;
}

function collectPaths(obj, prefix = '') {
  const paths = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      paths.push(...collectPaths(obj[key], fullKey));
    } else {
      paths.push(fullKey);
    }
  }
  return paths;
}

// Collect flat dotted keys at root level (keys with literal dots in name)
function collectFlatDottedKeys(obj) {
  return Object.keys(obj).filter(k => k.includes('.'));
}

function getByPath(obj, dotPath) {
  let cur = obj;
  for (const p of dotPath.split('.')) {
    if (cur === undefined || cur === null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteByPath(obj, dotPath) {
  // Try direct flat key first (for keys with literal dots in name)
  if (obj.hasOwnProperty(dotPath)) {
    delete obj[dotPath];
    return;
  }
  const parts = dotPath.split('.');
  const stack = [obj];
  for (let i = 0; i < parts.length - 1; i++) {
    const next = stack[stack.length - 1]?.[parts[i]];
    if (typeof next !== 'object' || next === null) return;
    stack.push(next);
  }
  delete stack[stack.length - 1][parts[parts.length - 1]];
  for (let i = stack.length - 1; i > 0; i--) {
    if (Object.keys(stack[i]).length === 0) delete stack[i - 1][parts[i - 1]];
    else break;
  }
}

// ────────────────────────────────────────────────────────────
// Language Detection
// ────────────────────────────────────────────────────────────

function looksLikePortuguese(text) {
  if (!text || typeof text !== 'string' || text.length < 3) return false;
  if (/^(https?:\/\/|[a-z0-9._-]+@|[A-Z_]{3,}$)/.test(text)) return false;
  const ptPatterns = [
    /ção\b/i, /ções\b/i, /ância\b/i, /ência\b/i,
    /ário\b/i, /ários\b/i, /ária\b/i, /árias\b/i,
    /ível\b/i, /ável\b/i,
    /\bNenhum/i, /\bNenhuma/i, /\bTem certeza/i, /\bErro ao/i,
    /\bFalha ao/i, /\bVocê\b/i, /\bGerencie\b/i,
    /\bConfigure\b/i, /\bSelecione\b/i, /\bDigite\b/i,
    /\bDescreva\b/i, /\bAdicione\b/i, /\bPreencha\b/i,
    /\bObrigatório/i, /\bRelatório/i,
    /\bEditar\b/i, /\bExcluir\b/i, /\bSalvar\b/i,
    /\bCancelar\b/i, /\bConfirmar\b/i, /\bCriar\b/i,
    /\bAtualizar\b/i, /\bCarregando\.\.\./i,
    /\bEnviando\.\.\./i, /\bSalvando\.\.\./i,
  ];
  return ptPatterns.some(p => p.test(text));
}

function looksLikeSpanish(text) {
  if (!text || typeof text !== 'string') return false;
  const esOnly = [
    /\bContraseña\b/i, /¿/, /¡/, /\bGuardar\b/i,
    /\bEliminar\b/i, /\bCerrar sesión\b/i, /\bUsuario\b/i,
  ];
  return esOnly.some(p => p.test(text));
}

// ────────────────────────────────────────────────────────────
// Translation Engine
// ────────────────────────────────────────────────────────────

function translateWithDict(ptValue, targetLocale) {
  const dict = targetLocale === 'en-US' ? PT_TO_EN : PT_TO_ES;
  if (dict[ptValue]) return dict[ptValue];
  // Case-insensitive fallback
  const lower = ptValue.toLowerCase();
  for (const [k, v] of Object.entries(dict)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function needsTranslation(currentValue, ptValue, targetLocale) {
  if (!currentValue || typeof currentValue !== 'string') return true;
  // If current value equals PT, check if the dictionary would give the same value
  // (meaning it's legitimately the same word in both languages)
  if (currentValue === ptValue) {
    const dictTranslation = translateWithDict(ptValue, targetLocale);
    if (dictTranslation && dictTranslation !== ptValue) return true;
    if (!dictTranslation && looksLikePortuguese(currentValue)) return true;
    return false;
  }
  if (targetLocale === 'en-US' && looksLikeSpanish(currentValue)) return true;
  if (targetLocale === 'en-US' && looksLikePortuguese(currentValue)) {
    // Double-check: if we have a translation and it's different from current, it needs fixing
    const dictTranslation = translateWithDict(ptValue, targetLocale);
    if (dictTranslation && dictTranslation !== currentValue) return true;
    // If dict translation matches current value, it's already correct
    if (dictTranslation && dictTranslation === currentValue) return false;
    return true;
  }
  return false;
}

// ────────────────────────────────────────────────────────────
// Backend API (optional runtime fallback)
// ────────────────────────────────────────────────────────────

function callTranslateAPI(text, targets) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ text, from_locale: 'pt-BR', targets });
    const url = new URL(`${BACKEND_URL}/api/v1/ai/translate`);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: 'POST', timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data).translations || null); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

async function checkBackendAvailable() {
  return new Promise((resolve) => {
    const url = new URL(BACKEND_URL);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: '/docs',
      method: 'HEAD', timeout: 3000,
    }, (res) => resolve(res.statusCode < 500));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   ProspecAI i18n Validation & Translation Script ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log(`📖  Dictionary: ${Object.keys(PT_TO_EN).length} PT→EN, ${Object.keys(PT_TO_ES).length} PT→ES entries`);

  const locales = {};
  for (const name of ALL_LOCALES) {
    const fp = path.join(LOCALES_DIR, `${name}.json`);
    if (!fs.existsSync(fp)) { console.error(`❌ Not found: ${fp}`); process.exit(1); }
    locales[name] = loadJson(fp);
    console.log(`📂  Loaded ${name}.json`);
  }

  const primary = locales[PRIMARY_LOCALE];
  const primaryPaths = collectPaths(primary);
  console.log(`\n🔑  Primary (${PRIMARY_LOCALE}): ${primaryPaths.length} keys\n`);

  let apiAvailable = false;
  if (USE_API) {
    apiAvailable = await checkBackendAvailable();
    console.log(apiAvailable ? '🌐  Backend API available' : '⚠️  Backend API not available');
  }

  const stats = { added: 0, removed: 0, translated: 0, corrected: 0, apiTranslated: 0, untranslated: 0 };

  // Clean flat dotted keys from all locale files
  for (const name of ALL_LOCALES) {
    const flatKeys = collectFlatDottedKeys(locales[name]);
    if (flatKeys.length > 0) {
      flatKeys.forEach(k => delete locales[name][k]);
      console.log(`🧹  Removed ${flatKeys.length} flat dotted key(s) from ${name}`);
    }
  }

  for (const secName of SECONDARY_LOCALES) {
    const sec = locales[secName];
    console.log(`\n─── Syncing & Translating ${secName} ───`);

    let added = 0, translated = 0, corrected = 0, untranslated = 0;
    const untranslatedKeys = [];

    for (const p of primaryPaths) {
      const priVal = getByPath(primary, p);
      const secVal = getByPath(sec, p);

      if (typeof priVal !== 'string') {
        if (priVal === undefined || priVal === null) continue;
        if (secVal === undefined) {
          try { setByPath(sec, p, JSON.parse(JSON.stringify(priVal))); added++; } catch { /* skip */ }
        }
        continue;
      }

      if (secVal === undefined) {
        const tr = translateWithDict(priVal, secName);
        setByPath(sec, p, tr || priVal);
        added++;
        if (tr) { translated++; if (translated <= 10) console.log(`  🌐  Translated: ${p}`); }
        else { untranslated++; untranslatedKeys.push(p); }
      } else if (typeof secVal === 'string' && needsTranslation(secVal, priVal, secName)) {
        const tr = translateWithDict(priVal, secName);
        if (tr) { setByPath(sec, p, tr); corrected++; if (corrected <= 10) console.log(`  🔄  Corrected: ${p}`); }
      }
    }

    if (translated > 10) console.log(`  ... and ${translated - 10} more translated`);
    if (corrected > 10) console.log(`  ... and ${corrected - 10} more corrected`);

    // API fallback for untranslated
    if (apiAvailable && untranslatedKeys.length > 0) {
      console.log(`\n  🤖  API fallback for ${untranslatedKeys.length} keys...`);
      let apiCount = 0;
      for (const p of untranslatedKeys) {
        const priVal = getByPath(primary, p);
        try {
          const result = await callTranslateAPI(priVal, [secName]);
          if (result?.[secName] && result[secName] !== priVal) {
            setByPath(sec, p, result[secName]);
            apiCount++;
          }
        } catch { /* skip */ }
      }
      console.log(`  ✅  API translated: ${apiCount}`);
      stats.apiTranslated += apiCount;
      untranslated -= apiCount;
    }

    // Remove extras (nested paths)
    let removed = 0;
    for (const p of collectPaths(sec)) {
      if (getByPath(primary, p) === undefined) {
        deleteByPath(sec, p); removed++;
        if (removed <= 5) console.log(`  ➖  Removed: ${p}`);
      }
    }
    // Remove flat dotted keys at root level
    for (const flatKey of collectFlatDottedKeys(sec)) {
      delete sec[flatKey]; removed++;
      if (removed <= 5) console.log(`  ➖  Removed flat key: ${flatKey}`);
    }
    if (removed > 5) console.log(`  ... and ${removed - 5} more removed`);

    console.log(`\n  📊  ${secName}: +${added} added | 🌐 ${translated} translated | 🔄 ${corrected} corrected | -${removed} removed`);
    if (untranslated > 0) console.log(`      ⚠️  ${untranslated} still untranslated (PT-BR fallback)`);

    stats.added += added;
    stats.removed += removed;
    stats.translated += translated;
    stats.corrected += corrected;
    stats.untranslated += untranslated;
  }

  for (const name of ALL_LOCALES) {
    const fp = path.join(LOCALES_DIR, `${name}.json`);
    saveJson(fp, locales[name]);
    console.log(`\n💾  Saved ${name}.json (${collectPaths(locales[name]).length} keys)`);
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  +${stats.added} added | 🌐 ${stats.translated} translated | 🔄 ${stats.corrected} corrected`);
  console.log(`║  -${stats.removed} removed | ⚠️  ${stats.untranslated} untranslated`);
  if (stats.apiTranslated > 0) console.log(`║  🤖 ${stats.apiTranslated} API-translated`);
  console.log('╚══════════════════════════════════════════════════════╝');

  if (stats.untranslated > 0) {
    console.log(`\n⚠️  ${stats.untranslated} keys remain with PT-BR fallback.`);
    console.log('   Add entries to scripts/i18n-dicts/pt-en.json and pt-es.json to fix.');
  } else {
    console.log('\n✅  All locale files are in sync and translated!');
  }
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1); });
