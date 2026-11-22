import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION, AUTHOR_INSTAGRAM_URL, formatStartCredit, renderAuthorCredit } from '../src/version.js';

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

test('renderAuthorCredit monta o texto com link do Instagram em nova aba', () => {
  const appended = [];
  const makeNode = (type, value = '') => ({
    type,
    textContent: value,
    href: '',
    target: '',
    rel: '',
    className: '',
  });
  const target = {
    textContent: 'old',
    ownerDocument: {
      createTextNode: (t) => makeNode('text', t),
      createElement: (tag) => makeNode(tag),
    },
    appendChild(node) {
      appended.push(node);
    },
  };
  renderAuthorCredit(target);
  assert.equal(appended.length, 3);
  assert.equal(appended[0].textContent, 'Desenvolvido por ');
  assert.equal(appended[1].type, 'a');
  assert.equal(appended[1].textContent, 'Gustavo Guanabara');
  assert.equal(appended[1].href, AUTHOR_INSTAGRAM_URL);
  assert.equal(appended[1].target, '_blank');
  assert.equal(appended[2].textContent, ` em 2026 — ${APP_VERSION}`);
});
