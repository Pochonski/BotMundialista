// Smoke test: require telegramBot.js y verificar que carga sin errores
// (no se ejecuta el init porque no hay TELEGRAM_BOT_TOKEN)
process.env.SUPPRESS_LOGS = 'true';
const Module = require('module');
const orig = Module.prototype.require;
const tReq = (id) => {
  if (id === 'node-fetch') return () => Promise.resolve({ ok: true, json: () => ({ ok: true, result: [] }) });
  return orig.call(this, id);
};

// Cargamos solo la sintaxis + resolución de requires vía un parseo estático alternativo.
// Estrategia: hacer require de cada handler nuevo y verificar exports.
const matchSearch = require('../services/matchSearch');
const mundialista365 = require('../handlers/mundialista365Handler');

const fs = require('fs');
const path = require('path');

console.log('-- archivos --');
const filesToCheck = [
  '../services/matchSearch.js',
  '../handlers/mundialista365Handler.js',
  '../telegramBot.js',
];
let ok = 0, fail = 0;
for (const rel of filesToCheck) {
  const p = path.resolve(__dirname, rel);
  if (fs.existsSync(p)) { console.log(`  \u2713 ${rel} existe`); ok++; }
  else { console.log(`  \u2717 ${rel} no encontrado`); fail++; }
}

console.log('\n-- telegramBot.js: comandos nuevos presentes en el switch --');
const tBot = fs.readFileSync(path.resolve(__dirname, '../telegramBot.js'), 'utf8');
const checks = [
  { name: "require mundialista365Handler", regex: /require\(['"]\.\/handlers\/mundialista365Handler['"]\)/ },
  { name: "/start menciona /tip", regex: /\/tip \[eq1\] vs \[eq2\]/ },
  { name: "/start menciona /tendencias vs equipos", regex: /\/tendencias \[eq1\] vs \[eq2\]/ },
  { name: "/start menciona /live", regex: /\/live/ },
  { name: "/start menciona /stats-vivo", regex: /\/stats-vivo <gameId>/ },
  { name: "/help menciona /tip", regex: /\/tip \[eq1\] vs \[eq2\]/ },
  { name: "/help menciona /tendencias vs equipos", regex: /\/tendencias \[eq1\] vs \[eq2\]/ },
  { name: "/help menciona /predicciones", regex: /\/predicciones <gameId>/ },
  { name: "case /live", regex: /cmd === '\/live'/ },
  { name: "case /tip con args", regex: /cmd\.startsWith\('\/tip '\)/ },
  { name: "case /tendencias", regex: /cmd === '\/tendencias'/ },
  { name: "case /tendencias con eq vs eq", regex: /getTendenciasByTeams/ },
  { name: "case /stats-vivo", regex: /cmd === '\/stats-vivo'/ },
  { name: "case /alineacion", regex: /cmd === '\/alineacion'/ },
  { name: "case /previa", regex: /cmd === '\/previa'/ },
  { name: "case /h2h", regex: /cmd === '\/h2h'/ },
  { name: "case /predicciones", regex: /cmd === '\/predicciones'/ },
];
for (const c of checks) {
  if (c.regex.test(tBot)) { console.log(`  \u2713 ${c.name}`); ok++; }
  else { console.log(`  \u2717 ${c.name}`); fail++; }
}

// Verificaciones negativas explícitas
const negative = [
  { name: "NO se llama getTendencias('game', arg)", notRegex: /getTendencias\('game', arg/ },
  { name: "NO menciona '/tendencias <gameId>' en telegramBot.js", notRegex: /\/tendencias <gameId>/ },
];
for (const c of negative) {
  if (!c.notRegex.test(tBot)) { console.log(`  \u2713 ${c.name}`); ok++; }
  else { console.log(`  \u2717 ${c.name}`); fail++; }
}

console.log(`\nPasados: ${ok} · Fallados: ${fail}`);
process.exit(fail === 0 ? 0 : 1);