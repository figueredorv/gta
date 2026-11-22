export const APP_VERSION = 'v1.7.3';
export const AUTHOR_INSTAGRAM_URL = 'https://www.instagram.com/gustavoguanabara/';

export function formatStartCredit(version = APP_VERSION) {
  return `Desenvolvido por Gustavo Guanabara em 2026 — ${version}`;
}

export function renderAuthorCredit(targetEl, version = APP_VERSION) {
  if (!targetEl) return;
  const doc = targetEl.ownerDocument;
  targetEl.textContent = '';
  targetEl.appendChild(doc.createTextNode('Desenvolvido por '));
  const authorLink = doc.createElement('a');
  authorLink.href = AUTHOR_INSTAGRAM_URL;
  authorLink.target = '_blank';
  authorLink.rel = 'noopener noreferrer';
  authorLink.className = 'start-credit-link';
  authorLink.textContent = 'Gustavo Guanabara';
  targetEl.appendChild(authorLink);
  targetEl.appendChild(doc.createTextNode(` em 2026 — ${version}`));
}
