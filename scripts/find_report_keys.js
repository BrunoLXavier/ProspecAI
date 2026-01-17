const fs=require('fs');
const path=require('path');
function walk(dir, exts){let res=[];for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);if(fs.statSync(p).isDirectory())res=res.concat(walk(p,exts));else if(exts.includes(path.extname(p)))res.push(p);}return res}
const dirs=['frontend/src/app/reports','frontend/src/components/reports'];
let files=[];for(const d of dirs){if(fs.existsSync(d)) files=files.concat(walk(d,['.ts','.tsx','.js','.jsx']));}
const re=/t\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
const keys=new Set();
for(const f of files){const s=fs.readFileSync(f,'utf8');let m;while((m=re.exec(s))){keys.add(m[1])}}
const found=Array.from(keys).sort();
console.log('FOUND_KEYS_COUNT',found.length);
console.log(found.join('\n'));
// load locales
const locales=['frontend/src/locales/en-US.json','frontend/src/locales/pt-BR.json','frontend/src/locales/es-ES.json'];
function flatten(obj,prefix=''){let out={};for(const k of Object.keys(obj)){const v=obj[k];const key=prefix?prefix+'.'+k:k; if(v && typeof v==='object'){Object.assign(out,flatten(v,key))}else out[key]=v}return out}
const localeFlat={};for(const L of locales){localeFlat[L]=flatten(JSON.parse(fs.readFileSync(L,'utf8')))}
const missing={};for(const L of locales){missing[L]=[]}
for(const k of found){const full='reports.'+k;for(const L of locales){if(!(full in localeFlat[L])) missing[L].push(full)}}
console.log('\nMISSING_PER_LOCALE:');for(const L of locales){console.log(L, missing[L].length);console.log(missing[L].join('\n')||'---')}
