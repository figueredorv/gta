import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, AUTHOR_INSTAGRAM_URL, formatStartCredit } from '../src/version.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

test('formatStartCredit exibe autoria, ano 2026 e a versão atual do sistema', () => {
  const text = formatStartCredit();
  assert.ok(text.includes('Desenvolvido por Gustavo Guanabara em 2026'));
  assert.ok(text.includes(APP_VERSION));
  assert.equal(AUTHOR_INSTAGRAM_URL, 'https://www.instagram.com/gustavoguanabara/');

  const readme = fs.readFileSync(path.join(appRoot, 'README.md'), 'utf8');
  const match = readme.match(/^###\s+`(v\d+\.\d+(?:\.\d+)?)`/m);
  assert.ok(match, 'README.md deve registrar a versão mais recente no histórico');
  assert.equal(APP_VERSION, match[1], 'APP_VERSION deve acompanhar a versão mais recente definida em README.md');
});
