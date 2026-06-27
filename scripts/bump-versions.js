#!/usr/bin/env node
/**
 * bump-versions.js
 * Recalcula el hash MD5 de cada archivo JS local referenciado en index.html
 * y actualiza los parámetros ?v= automáticamente.
 * Se ejecuta automáticamente como hook pre-commit.
 */
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT      = path.resolve(__dirname, '..');
const HTML_FILE = path.join(ROOT, 'index.html');

function md5Short(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch {
    return 'xxxxxxxx';
  }
}

let html = fs.readFileSync(HTML_FILE, 'utf8');

// Reemplaza ?v=XXXXXXXX por el hash actual del archivo
html = html.replace(/src="(js\/[^"]+\.js)\?v=[^"]+"/g, (match, relPath) => {
  const absPath = path.join(ROOT, relPath);
  const hash    = md5Short(absPath);
  return `src="${relPath}?v=${hash}"`;
});

fs.writeFileSync(HTML_FILE, html, 'utf8');
console.log('[bump-versions] index.html actualizado con hashes MD5.');
